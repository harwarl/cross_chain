import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AbiCoder, parseEther, ZeroAddress } from "ethers";
import { MintableERC20Mock, PrivacyBridgeHarness, WETHT, WrappedBridgeHarness } from "../typechain-types";
import hre from "hardhat";
import { expect } from "chai";
import { generateProof, prepareInputs } from "../lib/zksnarks";

describe("PrivacyBridge", () => {
  const privacyTokenChainId = 0;
  const wrappedTokenChainId = 1;
  const amount = parseEther("10");
  const pkUnlocking = 1;
  const pkMint = 0;
  const sharedDecimals = 6;
  const wethSharedDecimals = 18;

  let owner: SignerWithAddress, user1: SignerWithAddress, endpointOwner: SignerWithAddress;
  let privacyBridge: PrivacyBridgeHarness;
  let wrappedBridge: WrappedBridgeHarness;
  let callParams: any;
  let adapterParams: any;
  let originalToken: MintableERC20Mock;
  let weth: WETHT;
  let originalTokenAddress: string;
  let originalTokenEndpoint: any;
  let wrappedTokenEndpoint: any;
  let privacyBridgeAddress: string;
  let wrappedBridgeAddress: string;
  let privacyBridgeFactory: any;
  let wrappedBridgeFactory: any;

  const createPayload = (
    pk = pkUnlocking,
    token?: string,
    withdrawalAmount = amount,
    totalAmount = amount,
    unwrapWeth = false,
  ) => {
    if (!token) {
      token = originalTokenAddress;
    }
    let abiCoder = new AbiCoder();
    return abiCoder.encode(
      ["uint8", "address", "address", "uint256", "uint256", "bool"],
      [pk, token, user1?.address, withdrawalAmount, totalAmount, unwrapWeth],
    );
  };

  const getProof = async (
    sign: string,
    balance: number,
    sender: string,
    recipient: string,
    token: string,
    transferAmount: number,
    bridgeId: number,
  ) => {
    const inputs = await prepareInputs(sign, balance, sender, recipient, token, transferAmount, bridgeId);
    const { proof, publicSignals } = await generateProof(inputs);
    return { proof, publicSignals };
  };

  beforeEach(async () => {
    let signers = await hre.ethers.getSigners();

    owner = signers.at(0)!;
    user1 = signers.at(1)!;
    endpointOwner = signers.at(2)!;

    const wethFactory = await hre.ethers.getContractFactory("WETHT");
    weth = await wethFactory.deploy();

    // set up LZ endpoint
    const endPointFactory = await hre.ethers.getContractFactory("LayerZeroEndpointStub");
    originalTokenEndpoint = await endPointFactory.deploy();
    wrappedTokenEndpoint = await endPointFactory.deploy();

    // deploy bridge
    privacyBridgeFactory = await hre.ethers.getContractFactory("PrivacyBridgeHarness");
    privacyBridge = await privacyBridgeFactory.deploy(
      await originalTokenEndpoint.getAddress(),
      wrappedTokenChainId,
      await weth.getAddress(),
    );
    privacyBridgeAddress = await privacyBridge.getAddress();

    //deploy Wrapped Token Bridge
    wrappedBridgeFactory = await hre.ethers.getContractFactory("WrappedBridgeHarness");
    wrappedBridge = await wrappedBridgeFactory.deploy(await wrappedTokenEndpoint.getAddress());
    wrappedBridgeAddress = await wrappedBridge.getAddress();

    //deploy mock mintable token
    const ERC20Factory = await hre.ethers.getContractFactory("MintableERC20Mock");
    originalToken = await ERC20Factory.deploy("TEST", "TEST");
    originalTokenAddress = await originalToken.getAddress();

    await privacyBridge.setTrustedRemoteAddress(wrappedTokenChainId, wrappedBridgeAddress);

    //Mint original token for the user
    await originalToken.mint(user1.address, amount);

    callParams = {
      refundAddress: user1.address,
      zroPaymentAddress: ZeroAddress,
    };

    adapterParams = "0x";
  });

  it("reverts when passing address zero as WETH in the constructor", async () => {
    await expect(
      privacyBridgeFactory.deploy(await originalTokenEndpoint.getAddress(), wrappedTokenChainId, ZeroAddress),
    ).to.be.revertedWith("PrivacyBridge: Invalid WETH Address");
  });

  it("doesn't renouce ownership", async () => {
    await expect(privacyBridge.renounceOwnership()).to.be.revertedWith(
      "TokenBridgeBase: Ownership renouncement is disabled",
    );
    expect(await privacyBridge.owner()).to.be.eq(owner.address);
  });

  describe("register token", () => {
    it("revert when passing address zero", async () => {
      await expect(privacyBridge.registerToken(ZeroAddress, sharedDecimals)).to.be.revertedWith(
        "PrivacyBridge: invalid token address",
      );
    });

    it("reverts if token already registered", async () => {
      await privacyBridge.registerToken(originalTokenAddress, sharedDecimals);

      await expect(privacyBridge.registerToken(originalTokenAddress, sharedDecimals)).to.be.revertedWith(
        "PrivacyBridge: token already registered",
      );
    });

    it("reverts when called by non owner", async () => {
      await expect(privacyBridge.connect(user1).registerToken(originalTokenAddress, sharedDecimals)).to.be.reverted;
    });

    it("reverts when shared Decimals is greater than local decimals", async () => {
      const invalidSharedDecimals = 19;
      await expect(privacyBridge.registerToken(originalTokenAddress, invalidSharedDecimals)).to.be.revertedWith(
        "PrivacyBridge: shared decimals must be less than or equal to local decimals",
      );
    });

    it("registers token and saves local to shared decimals conversion rate", async () => {
      await privacyBridge.registerToken(originalTokenAddress, sharedDecimals);
      expect(await privacyBridge.supportedTokens(originalTokenAddress)).to.be.true;

      expect(await privacyBridge.LDtoSDConversionRate(originalTokenAddress)).to.be.eq(10 ** 12);
    });
  });

  describe("setRemoteChainId", () => {
    const newRemoteChainId = 2;
    it("reverts when called by non owner", async () => {
      await expect(privacyBridge.connect(user1).setRemoteChainId(newRemoteChainId)).to.be.reverted;
    });

    it("sets remote chain id", async () => {
      await privacyBridge.setRemoteChainId(newRemoteChainId);
      expect(await privacyBridge.remoteChainId()).to.be.eq(newRemoteChainId);
    });
  });

  describe("setUseCustomAdapterParams", () => {
    it("reverts when called by non owner", async () => {
      await expect(privacyBridge.connect(user1).setUseCustomAdapterParams(true)).to.be.reverted;
    });

    it("sets useCustomAdapterParams to be true", async () => {
      await privacyBridge.setUseCustomAdapterParams(true);
      expect(await privacyBridge.useCustomAdapterParams()).to.be.true;
    });
  });

  describe("bridge zksnarks", async () => {
    let a: any, b: any, c: any, publicInput: any, pKey: string, fee: any;

    beforeEach(async () => {
      // Estimate the fees for the bridge operation
      fee = await privacyBridge.estimateBridgeFees(false, adapterParams);
      // Approve the PrivacyBridge contract to spend the tokens for the transaction
      await originalToken.connect(user1).approve(await privacyBridge.getAddress(), amount);
    });

    // it("reverts when an invalid input is sent", async () => {
    //   const { proof, publicSignals } = await getProof(
    //     "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    //     100,
    //     user1.address,
    //     user1.address,
    //     originalTokenAddress,
    //     50,
    //     1,
    //   );

    //   await expect(
    //     privacyBridge.bridge(callParams, adapterParams, proof.pi_a, proof.pi_b, proof.pi_c, publicSignals, {
    //       value: fee,
    //     }),
    //   ).to.be.revertedWith("PrivacyBridge: zk_Snark verification failed");
    // });
  });
});
