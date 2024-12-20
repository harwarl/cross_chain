import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Pool, PrivacyBridge, ReceiptVerifier, Verifier } from "../typechain-types";

const deployBridge: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // ++++++++++++ POOL ++++++++++++
  await deploy("Pool", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const pool: Pool = await hre.ethers.getContract("Pool");
  console.log("Pool Address -", await pool.getAddress());

  // ++++++++++++ VERIFIER ++++++++++++
  await deploy("Verifier", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const verifier: Verifier = await hre.ethers.getContract("Verifier");
  console.log("Verifier Address -", await verifier.getAddress());

  // ++++++++++++ RECEIPT VERIFIER ++++++++++++
  await deploy("ReceiptVerifier", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const receiptVerifier: ReceiptVerifier = await hre.ethers.getContract("ReceiptVerifier");
  const receiptVerifierAddress = await receiptVerifier.getAddress();
  console.log("receiptVerifier Address -", await receiptVerifier.getAddress());

  // ++++++++++++ PRIVACY BRIDGE ++++++++++++
  await deploy("PrivacyBridge", {
    from: deployer,
    args: [receiptVerifierAddress],
    log: true,
    autoMine: true,
  });

  const privacyBridge: PrivacyBridge = await hre.ethers.getContract("PrivacyBridge");
  console.log("privacyBridge Address -", await privacyBridge.getAddress());
};

export default deployBridge;

deployBridge.tags = ["Pool", "Bridge", "Verifier"];
