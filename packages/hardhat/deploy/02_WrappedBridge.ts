import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import LZ_ENDPOINT from "../constants/layerZeroEndpoint.json";

const deployWrappedBridge: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const network = hre.network;

  console.log(`Deployer Address: ${deployer}`);
  console.log({ network });

  const lzEndpointAddress = LZ_ENDPOINT[network.name as keyof typeof LZ_ENDPOINT];
  console.log(`[${network.name}] Remote ChainId: ${lzEndpointAddress}`);

  await deploy("WrappedBridge", {
    from: deployer,
    args: [lzEndpointAddress],
    log: true,
    waitConfirmations: 1,
    skipIfAlreadyDeployed: true,
    autoMine: true,
  });
};

export default deployWrappedBridge;

deployWrappedBridge.tags = ["WrappedBridge"];
