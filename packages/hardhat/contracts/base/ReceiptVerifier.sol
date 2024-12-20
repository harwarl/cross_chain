//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Verifier.sol";
import "hardhat/console.sol";

error ReceiptVerifier__WrongChain();
error ReceiptVerifier__InvalidReceiptDetails();

/**
 * @title Receipt Verifier
 * @author Dokun
 * @notice Provides functionality for verifying and processing transaction receipts with zk-SNARK proofs.
 */
contract ReceiptVerifier is Verifier {
    struct Receipt {
        bytes from; // Source Address (encoded)
        bytes to; // Destination Address (encoded)
        string tokenSymbol;
        uint256 amount;
        uint256 chainFrom;
        uint256 chainTo;
        uint256 timestamp;
        uint256[1] publicInputs; // zk-SNARK public inputs
    }

    mapping(bytes32 => bool) public processedReceipts;

    /**
     * @notice Processes and validates a receipt.
     * @param _receipt The receipt data.
     * @param _a zk-SNARK proof part A.
     * @param _b zk-SNARK proof part B.
     * @param _c zk-SNARK proof part C.
     */
    function _useReceipt(
        Receipt calldata _receipt,
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c
    ) public {
        _validateReceipt(_receipt);
        _verifyChainId(_receipt);
        bytes32 receiptHash = _buildHash(_receipt);
        _doubleSpendGuard(receiptHash);
        _verifyProofWithInputs(_a, _b, _c, _receipt.publicInputs);
    }

    /**
     * @notice Builds the hash for the current receipt.
     * @param _receipt The receipt details.
     * @return The hash of the receipt.
     */
    function _buildHash(Receipt memory _receipt) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    _receipt.from,
                    _receipt.to,
                    _receipt.tokenSymbol,
                    _receipt.amount,
                    _receipt.chainFrom,
                    _receipt.chainTo,
                    _receipt.timestamp
                )
            );
    }

    /**
     * @notice Prevents double spending by ensuring the receipt hasn't been processed.
     * @param _receiptHash The hash of the receipt.
     */
    function _doubleSpendGuard(bytes32 _receiptHash) internal {
        require(processedReceipts[_receiptHash] == false, "Receipt Verifier: Already Processed Receipt");
        processedReceipts[_receiptHash] = true;
    }

    /**
     * @notice Verifies that the receipt is for the current chain.
     * @param _receipt The receipt details.
     */
    function _verifyChainId(Receipt memory _receipt) internal view {
        if (_receipt.chainFrom != block.chainid) {
            revert ReceiptVerifier__WrongChain();
        }
    }

    /**
     * @notice Verifies the zk-SNARK proof and ensures it matches the receipt hash.
     * @param _a zk-SNARK proof part A.
     * @param _b zk-SNARK proof part B.
     * @param _c zk-SNARK proof part C.
     * @param _publicInputs zk-SNARK public inputs.
     */
    function _verifyProofWithInputs(
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c,
        uint256[1] calldata _publicInputs
    ) internal view {
        // Verify zk-SNARK proof
        bool isValid = this.verifyProof(_a, _b, _c, _publicInputs);
        require(isValid, "ReceiptVerifier: zk-SNARK verification failed");
    }

    /**
     * @notice Validates the receipt details for logical consistency.
     * @param _receipt The receipt details.
     */
    function _validateReceipt(Receipt calldata _receipt) internal pure {
        require(_receipt.amount != 0, "ReceiptVerifier: Invalid Receipt Details");
        require(_receipt.chainFrom != _receipt.chainTo, "ReceiptVerifier: Invalid Receipt Details");
    }
}
