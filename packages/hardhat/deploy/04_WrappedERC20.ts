import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployWrappedERC20: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const wrappedBridge = await hre.ethers.getContract("WrappedTokenBridge");
  const wrappedTokens = ["WETH", "USDC", "USDT"];

  for (let i = 0; i < wrappedTokens.length; i++) {
    await deploy(wrappedTokens[i], {
      from: deployer,
      args: [await wrappedBridge.getAddress()],
      log: true,
      waitConfirmations: 1,
      skipIfAlreadyDeployed: true,
      autoMine: true,
    });
  }
};

export default deployWrappedERC20;

deployWrappedERC20.tags = ["WrappedERC20"];
