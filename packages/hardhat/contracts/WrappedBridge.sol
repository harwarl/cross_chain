// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./base/TokenBridgeBase.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/libs/LzLib.sol";
import "./interface/IWrappedERC20.sol";

/// @dev mints a wrapped token when a message is received from a remote chain
/// @dev burns a wrapped token when bridging to a remote chain
contract WrappedBridge is TokenBridgeBase {
    /// @notice Total bps representing 100%
    uint16 public constant TOTAL_BPS = 10000;

    /// @notice Optional fee charged on withdrawal
    uint16 public withdrawalFeeBps;

    /// @notice Tokens that can be bridged
    /// @dev [local token] => [remote chain] => [remote token]
    mapping(address => mapping(uint16 => address)) public localToRemote;

    /// @notice Tokens that can be bridged
    /// @dev [remote token] => [remote chain] => [local token]
    mapping(address => mapping(uint16 => address)) public remoteToLocal;

    /// @notice Total value bridged per token and remote chains
    /// @dev [remote chain] => [remote token] => [bridged amount]
    mapping(uint16 => mapping(address => uint)) public totalValueLocked;

    /// @notice Events
    event RegisterToken(address localToken, uint16 remoteChainId, address remoteToken);
    event SetWithdrawalFeeBps(uint16 withdrawalFeeBps);
    event UnwrapToken(address localToken, address remoteToken, uint16 remoteChainId, address to, uint amount);
    event WrapToken(address localToken, address remoteToken, uint16 srcChainId, address to, uint amount);
    

    constructor(address _endpoint) TokenBridgeBase(_endpoint) {}

    /**
     * @notice registers a local Wrap Token 
     * @param localToken Wrapped token Address
     * @param remoteChainId chainId of the original token
     * @param remoteToken Original Token address to be unlocked
     */
    function registerToken(address localToken, uint16 remoteChainId, address remoteToken) external onlyOwner {
        require(localToken != address(0), "WrappedBridge: invalid local token address");
        require(remoteToken != address(0), "WrappedBridge: invalid local token address");

        //check if the token has already been added
        require(localToRemote[localToken][remoteChainId] == address(0) && remoteToLocal[remoteToken][remoteChainId] == address(0), "WrappedBridge: token already registered");

        //Add the tokens 
        localToRemote[localToken][remoteChainId] = remoteToken;
        remoteToLocal[remoteToken][remoteChainId] = localToken;

        //emit the event
        emit RegisterToken(localToken, remoteChainId, remoteToken);
    }

    /// @notice Sets the withdrawal fee
    function setWithdrawalFeeBps(uint16 _withdrawalFeeBps) external onlyOwner {
        require(_withdrawalFeeBps < TOTAL_BPS, "WrappedBridge: invalid withdrawal fee bps");
        withdrawalFeeBps = _withdrawalFeeBps;
        emit SetWithdrawalFeeBps(withdrawalFeeBps);
    }

    /// @notice get the estimated Fee for the bridging
    function estimateBridgeFees(uint16 remoteChainId, bool useZro, bytes calldata adapterParams) external view returns (uint nativeFee, uint zroFee){
        bytes memory payload = abi.encode(PT_UNLOCKING, address(this), address(this), 0, 0, false);
        return lzEndpoint.estimateFees(remoteChainId, address(this), payload, useZro, adapterParams);
    }

    /// @notice Bridges the localToken to the remote chain
    /// @dev Burns wrapped tokens and sends LZ message to the remote chain to unlock original tokens
    function bridge (address localToken, 
    uint16 remoteChainId, 
    uint amount, 
    address to, 
    address sender,
    bool unwrapWeth, 
    LzLib.CallParams calldata callParams, 
    bytes memory adapterParams) external payable nonReentrant {
        //initial checks
        require(localToken != address(0), "WrappedBridge: invalid token");
        require(to != address(0), "WrappedBridge: invalid to");
        require(amount > 0, "Wrapped bridge: Invalid amount");
        _checkAdapterParams(remoteChainId, PT_UNLOCKING, adapterParams);

        //Check if token is registered
        address remoteToken = localToRemote[localToken][remoteChainId];
        require(remoteToken != address(0), "WrappedBridge: token is not supported");

        //check if the total value of that token in the destination chain has not exceeded.
        require(totalValueLocked[remoteChainId][remoteToken] >= amount, "WrappedBridge: insufficient liquidity on the destination");
        
        //burn the token
        IWrappedERC20(localToken).burn(msg.sender, amount);

        uint withdrawalAmount = amount;
        if(withdrawalFeeBps >0){
            uint withdrawalFee = (amount * withdrawalFeeBps) / TOTAL_BPS;
            withdrawalAmount -= withdrawalFee;
        }

        bytes memory payload = abi.encode(PT_UNLOCKING, remoteToken, to, withdrawalAmount, amount, unwrapWeth);
        _lzSend(remoteChainId, payload, callParams.refundAddress, callParams.zroPaymentAddress, adapterParams, msg.value);
        
        //emit UnwrapToken event
        emit UnwrapToken(localToken, remoteToken, remoteChainId, to, amount);
    }

    /// @notice Receives ERC20 tokens or ETH from the remote chain
    /// @dev Mints wrapped tokens in response to LZ message from the remote chain
    function _nonblockingLzReceive(uint16 srcChainId, bytes memory, uint64, bytes memory payload) internal virtual override {
        (uint8 packetType, address remoteToken, address to, uint amount) = abi.decode(payload, (uint8, address, address, uint));

        require(packetType == PT_MINT, "WrappedBridge: Unknown packet type");

        //Gets the local Token the remote token can be swapped to
        address localToken = remoteToLocal[remoteToken][srcChainId];
        require(localToken != address(0), "WrappedBridge: token is not supported");

        totalValueLocked[srcChainId][remoteToken] += amount;
        IWrappedERC20(localToken).mint(to, amount);

        emit WrapToken(localToken, remoteToken, srcChainId, to, amount);
    }
}