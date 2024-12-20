//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./base/Pool.sol";
import "./base/ReceiptVerifier.sol";

contract PrivacyBridge is Pool, ReceiptVerifier {
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

    mapping(address => uint256) private userNonces;
    ReceiptVerifier public receiptVerifier;
    mapping(bytes32 => ReceiptVerifier.Receipt) public receipts;
    mapping(bytes32 => bool) public claimedReceipts;

    
    constructor() {}

    /**
     * @notice Handles the sending of tokens from the sender
     * @param _symbol Symbol of the token e.g., ETH
     * @param _sender Address of the sender
     * @param _amount Amount to be burned
     * @param _recipient The recipient's address
     * @param _destinationChainId Destination chain ID
     * @param _a Zero-knowledge proof data
     * @param _b Zero-knowledge proof data
     * @param _c Zero-knowledge proof data
     * @param _publicInputs Public inputs for the proof
     */
    function send(
        string memory _symbol, 
        address _sender,
        uint256 _amount,
        address _recipient,
        uint256 _destinationChainId,
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c,
        uint256[1] calldata _publicInputs
    ) external  {
        require(_recipient != address(0), "PrivacyBridge: Invalid recipient address");

        require(_amount > 0, "PrivacyBridge: Amount must be greater than zero");
        uint256 sourceChainId = block.chainid;
        console.log(_symbol, sourceChainId);
        require(isTokenSupported(_symbol, sourceChainId),  "PrivacyBridge: Source chain token not supported");

        uint256 currentNonce = userNonces[_sender];

        bytes32 receiptId = keccak256(abi.encodePacked(
            _sender,
            _recipient,
            _symbol,
            _amount,
            sourceChainId,
            _destinationChainId,
            currentNonce,
            blockhash(block.number - 1)
        ));

        userNonces[_sender]++;

        //Generate a receipt
        ReceiptVerifier.Receipt memory receipt = ReceiptVerifier.Receipt({
            from: abi.encodePacked(_sender),
            to: abi.encodePacked(_recipient),
            tokenSymbol: _symbol,
            amount: _amount,
            chainFrom: sourceChainId,
            chainTo: _destinationChainId,
            timestamp: block.timestamp,
            publicInputs: _publicInputs
        });

        receipts[receiptId] = receipt;

        //Verify the zk snarks
        receiptVerifier._useReceipt(
            receipt,
            _a,
            _b,
            _c
        );

        _burn(_symbol, sourceChainId, _sender, _amount);
        claimedReceipts[receiptId] = false;

        emit TokenSent(receiptId, _symbol, sourceChainId, _destinationChainId, _amount);
    }


    /**
     * @notice Handles the claiming of tokens by the recipient
     * @param _receiptId Receipt ID hash
     * @param _symbol Symbol of the token e.g., ETH
     * @param _amount Amount to be minted
     * @param _sourceChainId Source chain ID
     * @param _recipient Recipient address
     * @param _a Zero-knowledge proof data
     * @param _b Zero-knowledge proof data
     * @param _c Zero-knowledge proof data
     */
    function claim (
        bytes32 _receiptId,
        string memory _symbol,
        uint256 _sourceChainId,
        uint256 _amount,
        address _recipient,
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c
    ) external onlyOwner {
        require(_amount > 0, "PrivacyBridge: Amount must be greater than zero");
        uint256 destinationChainId = block.chainid;
        require(isTokenSupported(_symbol, destinationChainId),  "PrivacyBridge: Destination chain token not supported");
        require(!claimedReceipts[_receiptId], "PrivacyBridge: Receipt already claimed");

        // Verify the zk-snark proof
        receiptVerifier._useReceipt(
            receipts[_receiptId],
                _a,
                _b,
                _c
            );

        _mint(_symbol, destinationChainId, _recipient, _amount);

        claimedReceipts[_receiptId] = true;

        emit TokenClaimed(_receiptId, _symbol, _sourceChainId, destinationChainId, _amount);
    }
}