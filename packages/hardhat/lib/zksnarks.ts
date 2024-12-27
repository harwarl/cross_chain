import crypto from "crypto";
import snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import fs from "fs";

async function prepareInputs(pKey: string, balance: number, transferAmount: number, bridgeId: number) {
  const poseidon = await buildPoseidon();
  const privateKey = BigInt(`0x${pKey}`);
  const identityNullifier = BigInt("0x" + crypto.randomBytes(32).toString("hex"));
  const nullifierPlusData = identityNullifier + BigInt(transferAmount) + BigInt(bridgeId);
  const identityCommitment = poseidon([privateKey, nullifierPlusData]);

  // Convert Poseidon outputs to hex strings
  const identityCHex = poseidon.F.toString(identityCommitment);

  return {
    identityCommitment: identityCHex,
    transferAmount,
    bridgeId, //
    balance,
    privateKey: privateKey.toString(),
    identityNullifier: identityNullifier.toString(),
  };
}

async function generateProof(input: any) {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "verifier_js/verifier.wasm", // Path to WASM file
    "verifier_js/verifier_0001.zkey", // Path to ZKey file
  );
  return { proof, publicSignals };
}

async function verifyProof(proof: any, publicSignals: any) {
  const vKey = JSON.parse(fs.readFileSync("verification_key.json", "utf8"));
  const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  return isValid;
}

(async () => {
  try {
    // Prepare inputs for the circuit
    const inputs = await prepareInputs("98379283", 543, 34343, 1);
    console.log("Prepared Inputs:", inputs);

    // Generate the zk-SNARK proof
    const { proof, publicSignals } = await generateProof(inputs);
    console.log("Proof:", proof);
    console.log("Public Signals:", publicSignals);

    // Verify the zk-SNARK proof
    const isValid = await verifyProof(proof, publicSignals);
    console.log("Is Proof Valid:", isValid);
  } catch (err) {
    console.error("Error:", err);
  }
})();
