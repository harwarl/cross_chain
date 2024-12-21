//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";


/// @dev An abstract contract containing a common functionality used by OriginTokenBridge and WrappedTokenBridge
abstract contract TokenBridgeBase is NonblockingLzApp, ReentrancyGuard {
    /// @notice a packet type used to identify messages requesting minting of wrapped tokens
    uint8 public constant PT_MINT = 0;

    /// @notice a packet type used to identify messages requesting unlocking of original tokens
    uint8 public constant PT_UNLOCKING = 1;

    bool public useCustomAdapterParams;

    event SetUseCustomAdapterParams(bool useCustomAdapterParams);

    constructor(address _endpoint) NonblockingLzApp(_endpoint) Ownable(msg.sender) {}

    /// @notice Sets the `useCustomAdapterParams` flag indicating whether the contract uses custom adapter parameters or the default ones
    /// @dev can only be called by the bridge owner
    function setUseCustomAdapterParams(bool _useCustomAdapterParams) external onlyOwner {
        useCustomAdapterParams = _useCustomAdapterParams;
        emit SetUseCustomAdapterParams(_useCustomAdapterParams);
    }

    /// @dev checks "adapterparams" 
    function _checkAdapterParams(uint16 dstChainId, uint16 pkType, bytes memory adapterParams) internal virtual {
        if(useCustomAdapterParams){
            _checkGasLimit(dstChainId, pkType, adapterParams, 0);
        } else {
            require(adapterParams.length == 0, "TokenBridgeBase: adapterParams must be empty");
        }
    }

    /// @dev overrides the renouce ownership logic from ownable
    function renounceOwnership() public view override onlyOwner {
        revert("TokenBridgeBase: Ownership renouncement is disabled");
    }
}