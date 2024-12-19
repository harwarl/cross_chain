import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Pool, PrivacyBridge, ReceiptVerifier, Verifier } from "../typechain-types";

const deployBridge: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  //Bridge
  await deploy("PrivacyBridge", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const privacyBridge: PrivacyBridge = await hre.ethers.getContract("PrivacyBridge");
  const priavcyBridgeAddress = await privacyBridge.getAddress();

  // POOL
  await deploy("Pool", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const pool: Pool = await hre.ethers.getContract("Pool");
  const poolAddress = await pool.getAddress();

  //ReceiptVerifier
  await deploy("ReceiptVerifier", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const receiptVerifier: ReceiptVerifier = await hre.ethers.getContract("ReceiptVerifier");
  const receiptVerifierAddress = await receiptVerifier.getAddress();

  console.log({ priavcyBridgeAddress, poolAddress, receiptVerifierAddress });
};

export default deployBridge;

deployBridge.tags = ["Pool", "Bridge", "Verifier"];
