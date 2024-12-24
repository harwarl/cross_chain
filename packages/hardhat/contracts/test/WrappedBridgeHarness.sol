//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../WrappedBridge.sol";

/// @dev used only in unit tests to call internal _nonblockingLzReceive
contract WrappedBridgeHarness is WrappedBridge{
    constructor(address _endpoint) WrappedBridge(_endpoint){}

    function simulateNonBlockingLzReceive(uint16 srcChainId, bytes memory payload) external {
        _nonblockingLzReceive(srcChainId, "0x", 0, payload);
    }
}