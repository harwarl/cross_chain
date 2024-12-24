//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../PrivacyBridge.sol";

/// @dev used only in unit tests to call internal _nonblockingLzReceive
contract PrivacyBridgeHarness is PrivacyBridge {
    constructor(address _endpoint, uint16 _remoteChainId, address _weth) PrivacyBridge(_endpoint, _remoteChainId, _weth){}

    function simulateNonblockingLzReceive(uint16 srcChainId, bytes memory payload) external {
        _nonblockingLzReceive(srcChainId, "0x", 0, payload);
    }
}