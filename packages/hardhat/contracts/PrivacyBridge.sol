//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./base/TokenBridgeBase.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/libs/LzLib.sol";
import "./interface/IWETH.sol";
import "./base/Verifier.sol";
import "hardhat/console.sol";

/// @dev Locks and ERC20 on the source chain and sends LZ message to the remote chain to mint a wrapped Token
contract PrivacyBridge is TokenBridgeBase, Verifier {
    using SafeERC20 for IERC20;

    /// @notice Tokens that can be bridged to the remote chain
    mapping(address => bool) public supportedTokens;

    /// @notice Token conversion rate from local decimals (LD) to shared decimals(SD)
    /// eg if LD is 18 and SD is 6, conversion rate is 10**(18-6)
    mapping(address => uint) public LDtoSDConversionRate;

    /// @notice Total Value locked per each supported token in shared decimals
    mapping(address => uint) public totalValueLockedSD;

    /// @notice layerzero id of the remote chain where the wrapped token are minted
    uint16 public remoteChainId;

    /// @notice Address of the wrapped native gas token eg WBNB, WETH
    address public immutable weth;
    
    event SendToken(address token, uint amount);
    event ReceiveToken(address token, uint amount);
    event SetRemoteChainId(uint16 remoteChainId);
    event RegisterToken(address token);
    event RemoveToken(address token);
    event WithdrawFee(address indexed token, uint amount);
    
    constructor(address _endpoint, uint16 _remoteChainId, address _weth) TokenBridgeBase (_endpoint){
        require(_weth != address(0), "PrivacyBridge: Invalid WETH Address");
        remoteChainId = _remoteChainId;
        weth = _weth;
    }

    /**
     * @notice registers a token
     * @param token address of the token
     * @param sharedDecimals number of decimals used for all original tokens mapped to the same wrapped token
     */
    function registerToken(address token, uint8 sharedDecimals) external onlyOwner {
        require(token != address(0), "PrivacyBridge: invalid token address");
        require(!supportedTokens[token], "PrivacyBridge: token already registered");

        uint localDecimals = _getTokenDecimals(token);
        require(localDecimals >= sharedDecimals,  "PrivacyBridge: shared decimals must be less than or equal to local decimals");

        supportedTokens[token] = true;

        LDtoSDConversionRate[token] = 10**(localDecimals - sharedDecimals);
        
        emit RegisterToken(token);
    }

    //TODO: Actual Brigde and the layer Zero receiver function
    function bridge(address token, uint amountLD, address to, LzLib.CallParams calldata callParams, bytes memory adapterParams) external payable nonReentrant {
        require(supportedTokens[token], "PrivacyBridge: token is not supported");

        uint balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amountLD);
        uint balanceAfter = IERC20(token).balanceOf(address(this));
        (uint amountWithoutDustLD, uint dust) = _removeDust(token, balanceAfter - balanceBefore);

        //return dust to the sender
        if(dust > 0){
            IERC20(token).safeTransfer(msg.sender, dust);
        }

        _bridge(token, amountWithoutDustLD, to, msg.value, callParams, adapterParams);
    }

    function bridgeNative(uint amountLD, address to, LzLib.CallParams calldata callParams, bytes memory adapterParams) external payable nonReentrant {
        require(supportedTokens[weth], "PrivacyBridge: token is not supported");
        require(msg.value >= amountLD, "PrivacyBridge: not enough value sent");
        (uint amountWithoutDustLD, ) = _removeDust(weth, amountLD);
        IWETH(weth).deposit{ value: amountWithoutDustLD}();
        _bridge(weth, amountWithoutDustLD, to, msg.value - amountWithoutDustLD, callParams, adapterParams);
    }

    
    function _bridge(address token, uint amountLD, address to, uint nativeFee, LzLib.CallParams calldata callParams, bytes memory adapterParams) private {
        require(to != address(0), "PrivacyBridge: invalid receiving address");
        _checkAdapterParams(remoteChainId, PT_MINT, adapterParams);

        uint amountSD = _amountLDtoSD(token, amountLD);
        require(amountSD > 0, "PrivacyBridge: invalid amount");

        totalValueLockedSD[token] += amountSD;
        bytes memory payload = abi.encode(PT_MINT, token, to, amountSD);
        _lzSend(remoteChainId, payload, callParams.refundAddress, callParams.zroPaymentAddress, adapterParams, nativeFee);
        emit SendToken(token, amountLD);
    }

    // This function is called when data is received. It overrides the equivalent function in the parent contract.
    function _nonblockingLzReceive(uint16 srcChainId, bytes memory, uint64, bytes memory _payload) internal virtual override {
        // The LayerZero _payload (message) is decoded as a string and stored in the "data" variable.
        require(srcChainId == remoteChainId, "PrivacyBridge: invalid source chain Id");
        
        //Decode the payload
        (uint8 packetType, address token, address to, uint withdrawAmountSD, uint totalAmountSD, bool unwrapWeth) = abi.decode(_payload, (uint8, address, address, uint, uint, bool));

        require(packetType == PT_UNLOCKING, "PrivacyBridge: unknown packet type");
        require(supportedTokens[token], "PrivacyBridge: token is not supported");

        totalValueLockedSD[token] -= totalAmountSD;
        uint withdrawalAmountLD = _amountSDtoLD(token, withdrawAmountSD);

        if(token == weth && unwrapWeth) {
            IWETH(weth).withdraw(withdrawalAmountLD);
            (bool success, ) = payable(to).call{ value: withdrawalAmountLD}("");
            require(success, "PrivacyBridge: failed to send");
            emit ReceiveToken(address(0), withdrawalAmountLD);
        } else {
            IERC20(token).safeTransfer(to, withdrawalAmountLD);
            emit ReceiveToken(token, withdrawalAmountLD);
        }
    }


    /**
     * @notice Estimates the fee required to bridge tokens to the remote chain using LayerZero.
     * @param useZro Indicates whether ZRO tokens are used to pay for the fees (if false, fees are paid in the native gas token).
     * @param adapterParams Optional parameters for gas settings or custom configurations for the bridge transaction.
     * @return nativeFee The estimated fee in the native gas token of the source chain (e.g., ETH, BNB).
     * @return zroFee The estimated fee in ZRO tokens (only applicable if useZro = true).
     */
    function estimateBridgeFees(bool useZro, bytes calldata adapterParams) public view returns (uint nativeFee, uint zroFee) {
        bytes memory payload = abi.encode(PT_MINT, address(this), address(this), 0);
        return lzEndpoint.estimateFees(remoteChainId, address(this), payload, useZro, adapterParams);
    }

    /**
     * @notice withdraws the contract balance of the specified token to the owners address
     * @param token the address of the intended token to be withdrawn
     * @param to address of the receiver;
     * @param amountLD amount in local Decimals
     */
    function withdrawFee(address token, address to, uint amountLD) public onlyOwner {
        uint feeLD = accruedFeeLD(token);
        require(amountLD <= feeLD, "PrivacyBridge: not enough fees collected");

        IERC20(token).safeTransfer(to, amountLD);
        emit WithdrawFee(token, amountLD);
    }

    /**
     * @notice gets the extra balance of the token left in the contract
     * @param token address of the token
     */
    function accruedFeeLD(address token) public view returns (uint) {
        return IERC20(token).balanceOf(address(this)) - _amountLDtoSD(token, totalValueLockedSD[token]);
    }

    /**
     * @notice removes the excess of the token when divided by token decimals
     * @param token token address
     * @param amountLD amount in local decimals
     * @return amountWithoutDustLD amount without the dust
     * @return dust the excess amount
     */
    function _removeDust(address token, uint amountLD) internal view returns (uint amountWithoutDustLD, uint dust) {
        dust = amountLD % LDtoSDConversionRate[token];
        amountWithoutDustLD = amountLD - dust;
    }

    /**
     * @notice sets the remote chain Id
     * @param _remoteChainId the remote chain Id
     */
    function setRemoteChainId(uint16 _remoteChainId) external onlyOwner {
        remoteChainId = _remoteChainId;
        emit SetRemoteChainId(_remoteChainId);
    }

    /**
     * @notice gets the corresponding price of the token in Shared Decimals -(uniformity)
     * @param token address of the token
     * @param amountLD the amount of the token in local decimals
     */
    function _amountLDtoSD(address token, uint amountLD) internal view returns(uint){
        return amountLD / LDtoSDConversionRate[token];
    }

    /**
     * @notice gets the price of a token in local decimals from shared decimals
     * @param token the token adddress
     * @param amountSD amount in shared decimals
     */
    function _amountSDtoLD(address token, uint amountSD) internal view returns(uint) {
        return amountSD * LDtoSDConversionRate[token];
    }

    /**
     * @notice get the decimals of the token
     * @param token token address
     */
    function _getTokenDecimals(address token) internal view returns (uint8){
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        require(success, "PrivacyBridge: failed to get token decimals");
        return abi.decode(data, (uint8));
    }

    /**
     * @notice Verifies the zk-SNARK proof and ensures it matches the receipt hash.
     * @param a zk-SNARK proof part A.
     * @param b zk-SNARK proof part B.
     * @param c zk-SNARK proof part C.
     * @param input zk-SNARK public inputs.
     */
    function _verifyProofWithInputs(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[1] calldata input
    ) internal view {
        bool isValid = this.verifyProof(a, b, c, input);
        require(isValid, "PrivacyBridge: zk_Snark verification failed");
    }

    receive() external payable {}
}
