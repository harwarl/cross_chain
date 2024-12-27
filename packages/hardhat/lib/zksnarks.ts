import crypto from "crypto";
import snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import fs from "fs";

export async function prepareInputs(
  sign: string,
  balance: number,
  sender: string,
  recipient: string,
  token: string,
  transferAmount: number,
  bridgeId: number,
) {
  const poseidon = await buildPoseidon();

  // Define private inputs
  const identityNullifier = BigInt("0x" + crypto.randomBytes(32).toString("hex"));

  // Calculate identity commitment: Poseidon(privateKey, identityNullifier + transferAmount + bridgeId)
  const nullifierPlusData =
    identityNullifier + BigInt(transferAmount) + BigInt(token) + BigInt(bridgeId) + BigInt(sender) + BigInt(recipient);
  const identityCommitment = poseidon([sign, nullifierPlusData]);

  // Convert Poseidon outputs to hex strings
  const identityCHex = poseidon.F.toString(identityCommitment);

  // Prepare inputs object
  const inputs = {
    identityCommitment: identityCHex, // Public input
    transferAmount, // Public input
    bridgeId, // Public input
    balance, // Private input
    privateKey: sign.toString(), // Private input
    nullifier: identityNullifier.toString(), // Private input
    tokenAddress: token,
    senderAddress: sender,
    recipientAddress: recipient,
  };

  return inputs;
}

export async function generateProof(input: any) {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "verifier.wasm", // Path to WASM file
    "verifier_0001.zkey", // Path to ZKey file
  );
  return { proof, publicSignals };
}
