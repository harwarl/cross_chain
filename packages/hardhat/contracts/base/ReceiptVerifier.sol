//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Roles.sol";
import "./Verifier.sol";

error ReceiptVerifier__AlreadyProcessedReceipts(bytes32);
error ReceiptVerifier__WrongChain();
// error ReceiptVerifier__ProofVerificationFailed();
error ReceiptVerifier__InvalidReceiptDetails();

abstract contract ReceiptVerifier is Roles, Verifier {
    struct Receipt {
        bytes from; //Source Address (encoded)
        bytes to; // Destination Address (enocded)
        string tokenSymbol;
        uint256 amount;
        uint256 chainFrom;
        uint256 chainTo;
        uint256 timestamp;
        uint256[1] publicInputs;
    }

    mapping(bytes32 => bool ) public processedReceipts;

    function _useReceipt(
        Receipt calldata _receipt,
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c
    ) internal {
        _validateReceipt(_receipt);
        verifyChainId(_receipt);
        bytes32 hash = _buildHash(_receipt);
        doubleSpendGuard(hash);
        verifyProofWithInputs(_a, _b, _c, _receipt.publicInputs, _receipt);
    }

    function _buildHash(Receipt memory _receipt) private pure returns(bytes32){
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

    function doubleSpendGuard(bytes32 _receiptId) internal {
        if(processedReceipts[_receiptId]) revert ReceiptVerifier__AlreadyProcessedReceipts(_receiptId);
        processedReceipts[_receiptId] = true;
    }

    function verifyChainId(Receipt memory _receipt) internal view {
        if (_receipt.chainTo != block.chainid) revert ReceiptVerifier__WrongChain();
    }

    function verifyProofWithInputs(
    uint[2] calldata _a,
    uint[2][2] calldata _b,
    uint[2] calldata _c,
    uint256[1] calldata _publicInputs,
    Receipt memory _receipt
) internal view {
    // Verify the proof using zk-SNARK verification
    bool isValid = verifyProof(_a, _b, _c, _publicInputs);
    require(isValid, "ReceiptVerifier: ProofVerificationFailed");

    // // Verify that the public input matches the receipt hash
    // uint256 expectedHash = uint256(_buildHash(_receipt));
    // require(_publicInputs[0] == expectedHash, "ReceiptVerifier: ProofVerificationFailed");
}


    function _validateReceipt(Receipt calldata _receipt) internal pure {
        if(_receipt.amount <= 0) revert ReceiptVerifier__InvalidReceiptDetails();
        if(_receipt.chainFrom == _receipt.chainTo) revert ReceiptVerifier__InvalidReceiptDetails();
    }
}