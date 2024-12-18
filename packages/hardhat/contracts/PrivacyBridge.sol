//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./base/Pool.sol";

contract PrivacyBridge is Pool {
    event TokenSent(
        bytes32 indexed receiptId,
        string symbol,
        uint256 sourceChainId,
        uint256 destinationChainId,
        uint256 amount
    );

    event TokenClaimed (
        bytes32 indexed receiptId,
        string symbol,
        uint256 sourceChainId,
        uint256 destinationChainId,
        uint256 amount
    );

    uint256 private nonce;

    // Constructor is intentionally left empty as no initialization is needed
    constructor() {}


    function send(
        string memory _symbol, 
        uint256 _amount,
        address _recipient,
        uint256 _destinationChainId
    ) external  {
        require(_amount > 0, "PrivacyBridge: Amount must be greater than zero");
        uint256 sourceChainId = block.chainid;

        require(isTokenSupported(_symbol, sourceChainId),  "PrivacyBridge: Source chain token not supported");

        bytes32 receiptId = keccak256(abi.encodePacked(
            msg.sender,
            _recipient,
            _symbol,
            _amount,
            sourceChainId,
            _destinationChainId,
            nonce, 
            blockhash(block.number - 1)
        ));

        nonce++;

        _burn(_symbol, sourceChainId, msg.sender, _amount);

        emit TokenSent(receiptId, _symbol, sourceChainId, _destinationChainId, _amount);
    }


    function claim (
        bytes32 _receiptId,
        string memory _symbol,
        uint256 _sourceChainId,
        uint256 _amount,
        address _recipient
    ) external onlyOwner {
        require(_amount > 0, "PrivacyBridge: Amount must be greater than zero");

        uint256 destinationChainId = block.chainid;
        require(isTokenSupported(_symbol, destinationChainId),  "PrivacyBridge: Destination chain token not supported");

        _mint(_symbol, destinationChainId, _recipient, _amount);

        emit TokenClaimed(_receiptId, _symbol, _sourceChainId, destinationChainId, _amount);
    }
}