//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./base/Pool.sol";
import "./base/ReceiptVerifier.sol";

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
    ReceiptVerifier public receiptVerifier;

    // Takes in the receipt verifier as an address
    constructor(address _receiptVerifier) {
        require(_receiptVerifier != address(0), "Privacy bridge: Invalid Address for the receipt verifier");
        receiptVerifier = ReceiptVerifier(_receiptVerifier);
    }

    /**
     * @notice deals with the sending of tokens from the sender
     * @param _symbol symbol of the token e.g ETH
     * @param _amount amount to be burned
     * @param _recipient the recipient address
     * @param _destinationChainId value of the destination chain Id
     */
    function send(
        string memory _symbol, 
        uint256 _amount,
        address _recipient,
        uint256 _destinationChainId,
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c,
        uint256[1] calldata _publicInputs
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

        //Generate a receipt
        ReceiptVerifier.Receipt memory receipt = ReceiptVerifier.Receipt({
            from: abi.encodePacked(msg.sender),
            to: abi.encodePacked(_recipient),
            tokenSymbol: _symbol,
            amount: _amount,
            chainFrom: sourceChainId,
            chainTo: _destinationChainId,
            timestamp: block.timestamp,
            publicInputs: _publicInputs
        });

        //Verify the zk snarks
        receiptVerifier._useReceipt(
            receipt,
            _a,
            _b,
            _c
        );

        _burn(_symbol, sourceChainId, msg.sender, _amount);

        emit TokenSent(receiptId, _symbol, sourceChainId, _destinationChainId, _amount);
    }


    /**
     * @notice deals with the sending of tokens from the sender
     * @param _receiptId hash of the receipt
     * @param _symbol symbol of the token e.g ETH
     * @param _amount amount to be burned
     * @param _sourceChainId source chain
     * @param _recipient recipient Address
     */
    function claim (
        bytes32 _receiptId,
        string memory _symbol,
        uint256 _sourceChainId,
        uint256 _amount,
        address _recipient,
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c,
        uint256[1] calldata _publicInputs
    ) external onlyOwner {
        require(_amount > 0, "PrivacyBridge: Amount must be greater than zero");

        uint256 destinationChainId = block.chainid;

        require(isTokenSupported(_symbol, destinationChainId),  "PrivacyBridge: Destination chain token not supported");

        _mint(_symbol, destinationChainId, _recipient, _amount);

        emit TokenClaimed(_receiptId, _symbol, _sourceChainId, destinationChainId, _amount);
    }
}