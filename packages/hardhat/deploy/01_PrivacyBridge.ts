import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import LZ_ENDPOINT from "../constants/layerZeroEndpoint.json";
import REMOTE_CHAIN_ID from "../constants/remoteChainId.json";
import WETHS from "../constants/weths.json";

const deployPrivacyBridge: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const network = hre.network;
  console.log(`Deployer Address: ${deployer}`);
  console.log({ network });

  const lzEndpointAddress = LZ_ENDPOINT[network.name as keyof typeof LZ_ENDPOINT];
  console.log(`[${network.name}] Endpoint Address: ${lzEndpointAddress}`);

  const remoteChainId = REMOTE_CHAIN_ID[network.name as keyof typeof REMOTE_CHAIN_ID];
  console.log(`[${network.name}] Remote ChainId: ${lzEndpointAddress}`);

  const weth = WETHS[network.name as keyof typeof WETHS];
  console.log(`[${network.name}] Weth Address: ${weth}`);

  await deploy("PrivacyBridge", {
    from: deployer,
    args: [lzEndpointAddress, remoteChainId, weth],
    log: true,
    waitConfirmations: 1,
    skipIfAlreadyDeployed: true,
    autoMine: true,
  });
};

export default deployPrivacyBridge;

deployPrivacyBridge.tags = ["PrivacyBridge"];
