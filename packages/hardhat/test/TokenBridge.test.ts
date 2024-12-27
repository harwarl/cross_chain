import { HardhatEthersSigner, SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import { MintableERC20Mock, PrivacyBridge, PrivacyBridgeHarness, WETHT } from "../typechain-types";
import { ContractFactory, getAddress } from "ethers";
import { expect } from "chai";
import ethers from "ethers";
import { toBigInt, ZeroAddress, solidityPacked, parseEther, AbiCoder } from "ethers";

describe("TokenBridge", () => {
  const privacyTokenChainId = 0;
  const wrappedTokenChainId = 1;
  //   const amount = ethers.parseEther("10");
  const amount = parseEther("10");
  const pkUnlocking = 1;
  const pkMint = 0;
  const sharedDecimals = 6;
  const wethSharedDecimals = 18;

  let owner: SignerWithAddress, user: SignerWithAddress, endpointOwner: SignerWithAddress;
  let privacyTokenBridge: PrivacyBridgeHarness;
  let callParams: any, adapterParams: any;
  let privacyToken: MintableERC20Mock, weth: WETHT;
  let privacyTokenAddress: any;
  let privacyTokenBridgeFactory: any;
  let privacyTokenEndpoint: any;
  let privacyBridgeAddress: any;

  const createPayload = (
    pk = pkUnlocking,
    token?: string,
    withdrawalAmount = amount,
    totalAmount = amount,
    unwrapWeth = false,
  ) => {
    if (!token) {
      token = privacyTokenAddress;
    }
    let abiCoder = new AbiCoder();
    return abiCoder.encode(
      ["uint8", "address", "address", "uint256", "uint256", "bool"],
      [pk, token, user?.address, withdrawalAmount, totalAmount, unwrapWeth],
    );
  };

  beforeEach(async () => {
    let signers = await hre.ethers.getSigners();

    owner = signers.at(0)!;
    user = signers.at(1)!;
    endpointOwner = signers.at(2)!;

    //set up mock WETH
    const wethFactory = await hre.ethers.getContractFactory("WETHT");
    weth = await wethFactory.deploy();
    // weth.waitForDeployment();

    //set up lZ endpoint
    const endPointFactory = await hre.ethers.getContractFactory("LayerZeroEndpointStub");
    privacyTokenEndpoint = await endPointFactory.deploy();
    const wrappedTokenEndpoint = await endPointFactory.deploy();

    // Deploy Bridge
    privacyTokenBridgeFactory = await hre.ethers.getContractFactory("PrivacyBridgeHarness");

    privacyTokenBridge = await privacyTokenBridgeFactory.deploy(
      await privacyTokenEndpoint.getAddress(),
      wrappedTokenChainId,
      await weth.getAddress(),
    );

    privacyBridgeAddress = await privacyTokenBridge.getAddress();

    // Deploy Wrapped Token Bridge
    const wrappedTokenBridgeFactory = await hre.ethers.getContractFactory("WrappedBridgeHarness");

    const wrappedTokenBridge = await wrappedTokenBridgeFactory.deploy(await wrappedTokenEndpoint.getAddress());

    // Deploy mock mintable token
    const ERC20Factory = await hre.ethers.getContractFactory("MintableERC20Mock");
    privacyToken = await ERC20Factory.deploy("TEST", "TEST");

    await privacyTokenBridge.setTrustedRemoteAddress(wrappedTokenChainId, await wrappedTokenBridge.getAddress());
    await privacyToken.mint(user.address, amount);
    privacyTokenAddress = await privacyToken.getAddress();

    callParams = { refundAddress: user.address, zroPaymentAddress: ZeroAddress };

    adapterParams = "0x";
  });

  it("reverts when passing address zero as WETH in the constructor", async () => {
    await expect(
      privacyTokenBridgeFactory.deploy(await privacyTokenEndpoint.getAddress(), wrappedTokenChainId, ZeroAddress),
    ).to.be.revertedWith("PrivacyBridge: Invalid WETH Address");
  });

  it("doesn't renouce ownership", async () => {
    await expect(privacyTokenBridge.renounceOwnership()).to.be.revertedWith(
      "TokenBridgeBase: Ownership renouncement is disabled",
    );
    expect(await privacyTokenBridge.owner()).to.be.eq(owner.address);
  });

  describe("register token", () => {
    beforeEach(async () => {
      privacyTokenAddress = await privacyToken.getAddress();
    });
    it("revert when passing address zero", async () => {
      await expect(privacyTokenBridge.registerToken(ZeroAddress, sharedDecimals)).to.be.revertedWith(
        "PrivacyBridge: invalid token address",
      );
    });

    it("reverts if token already registered", async () => {
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);

      await expect(privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals)).to.be.revertedWith(
        "PrivacyBridge: token already registered",
      );
    });

    it("reverts when called by non owner", async () => {
      await expect(privacyTokenBridge.connect(user).registerToken(privacyTokenAddress, sharedDecimals)).to.be.reverted;
    });

    it("reverts when shared Decimals is greater than local decimals", async () => {
      const invalidSharedDecimals = 19;
      await expect(privacyTokenBridge.registerToken(privacyTokenAddress, invalidSharedDecimals)).to.be.revertedWith(
        "PrivacyBridge: shared decimals must be less than or equal to local decimals",
      );
    });

    it("registers token and saves local to shared decimals conversion rate", async () => {
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);
      expect(await privacyTokenBridge.supportedTokens(privacyTokenAddress)).to.be.true;

      expect(await privacyTokenBridge.LDtoSDConversionRate(privacyTokenAddress)).to.be.eq(10 ** 12);
    });
  });

  describe("setRemoteChainId", () => {
    const newRemoteChainId = 2;
    it("reverts when called by non owner", async () => {
      await expect(privacyTokenBridge.connect(user).setRemoteChainId(newRemoteChainId)).to.be.reverted;
    });

    it("sets remote chain id", async () => {
      await privacyTokenBridge.setRemoteChainId(newRemoteChainId);
      expect(await privacyTokenBridge.remoteChainId()).to.be.eq(newRemoteChainId);
    });
  });

  describe("setUseCustomAdapterParams", () => {
    it("reverts when called by non owner", async () => {
      await expect(privacyTokenBridge.connect(user).setUseCustomAdapterParams(true)).to.be.reverted;
    });

    it("sets useCustomAdapterParams to be true", async () => {
      await privacyTokenBridge.setUseCustomAdapterParams(true);
      expect(await privacyTokenBridge.useCustomAdapterParams()).to.be.true;
    });
  });

  describe("bridge", () => {
    let fee: any;
    beforeEach(async () => {
      fee = (await privacyTokenBridge.estimateBridgeFees(false, adapterParams)).nativeFee;
      await privacyToken.connect(user).approve(await privacyTokenBridge.getAddress(), amount);
    });

    it("reverts when to is address zero", async () => {
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);
      await expect(
        privacyTokenBridge
          .connect(user)
          .bridge(privacyTokenAddress, amount, ZeroAddress, callParams, adapterParams, { value: fee }),
      ).to.be.reverted;
    });

    it("reverts when token is not registered", async () => {
      await expect(
        privacyTokenBridge
          .connect(user)
          .bridge(privacyTokenAddress, amount, user.address, callParams, adapterParams, { value: fee }),
      ).to.be.revertedWith("PrivacyBridge: token is not supported");
    });

    it("reverts when useCustomAdapterParams is false and non-empty adapterParams are passed", async () => {
      const adapterParamsV1 = solidityPacked(["uint16", "uint256"], [1, 200000]);

      await privacyToken.connect(user).approveAndLog(await privacyTokenBridge.getAddress(), amount);
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);

      await expect(
        privacyTokenBridge
          .connect(user)
          .bridge(privacyTokenAddress, amount, user.address, callParams, adapterParamsV1, {
            value: fee,
          }),
      ).to.be.revertedWith("TokenBridgeBase: adapterParams must be empty");
    });

    it("reverts when amount is 0", async () => {
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);
      await expect(
        privacyTokenBridge
          .connect(user)
          .bridge(privacyTokenAddress, 0, user.address, callParams, adapterParams, { value: fee }),
      ).to.be.revertedWith("PrivacyBridge: invalid amount");
    });

    it("reverts when the sender doesn't have enough tokens", async () => {
      let newAmount = amount + parseEther("20");

      const tx = await privacyToken.connect(user).approveAndLog(privacyBridgeAddress, newAmount);
      await tx.wait();

      await privacyTokenBridge.registerToken(await privacyToken.getAddress(), sharedDecimals);

      await expect(
        privacyTokenBridge
          .connect(user)
          .bridge(await privacyToken.getAddress(), newAmount, getAddress(user.address), callParams, adapterParams, {
            value: fee,
          }),
      ).to.be.reverted;
    });

    it("locks tokens in the contract", async () => {
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);
      await privacyToken.connect(user).approve(await privacyTokenBridge.getAddress(), amount);

      await privacyTokenBridge
        .connect(user)
        .bridge(
          privacyTokenAddress,
          amount,
          user.address,
          { refundAddress: user.address, zroPaymentAddress: ZeroAddress },
          "0x",
          { value: fee },
        );
      const LDtoSD = await privacyTokenBridge.LDtoSDConversionRate(privacyTokenAddress);

      console.log(await privacyTokenBridge.totalValueLockedSD(privacyTokenAddress));
      expect(await privacyTokenBridge.totalValueLockedSD(privacyTokenAddress)).to.be.eq(amount / LDtoSD);

      expect(await privacyToken.balanceOf(await privacyTokenBridge.getAddress())).to.be.eq(amount);
      expect(await privacyToken.balanceOf(user.address)).to.be.eq(0);
    });

    it("locks tokens in the contract and returns dust to the sender", async () => {
      const dust = toBigInt("12345");
      const amountWithDust = amount + dust;

      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);
      await privacyToken.mint(user.address, dust);
      await privacyToken.connect(user).approve(await privacyTokenBridge.getAddress(), amountWithDust);
      await privacyTokenBridge
        .connect(user)
        .bridge(privacyTokenAddress, amountWithDust, user.address, callParams, adapterParams, { value: fee });
      const LDtoSD = await privacyTokenBridge.LDtoSDConversionRate(privacyTokenAddress);

      expect(await privacyTokenBridge.totalValueLockedSD(privacyTokenAddress)).to.be.eq(amount / LDtoSD);
      expect(await privacyToken.balanceOf(await privacyTokenBridge.getAddress())).to.be.eq(amount);
      expect(await privacyToken.balanceOf(user.address)).to.be.eq(dust);
    });
  });

  describe("bridgeNative", () => {
    let totalAmount: any;
    let wethAddress: string;
    beforeEach(async () => {
      const fee = (await privacyTokenBridge.estimateBridgeFees(false, adapterParams)).nativeFee;
      totalAmount = amount + fee;
      wethAddress = await weth.getAddress();
    });

    it("reverts when to is address zero", async () => {
      await privacyTokenBridge.registerToken(wethAddress, wethSharedDecimals);
      await expect(
        privacyTokenBridge
          .connect(user)
          .bridgeNative(amount, ZeroAddress, callParams, adapterParams, { value: totalAmount }),
      ).to.be.revertedWith("PrivacyBridge: invalid receiving address");
    });

    it("revert when WETH is not registered", async () => {
      await expect(
        privacyTokenBridge
          .connect(user)
          .bridgeNative(amount, user.address, callParams, adapterParams, { value: totalAmount }),
      ).to.be.revertedWith("PrivacyBridge: token is not supported");
    });

    it("reverts when useCustomAdapterParams is false and non-empty adapterParams are passed", async () => {
      const adapterParamsV1 = solidityPacked(["uint16", "uint256"], [1, 200000]);
      await privacyTokenBridge.registerToken(wethAddress, wethSharedDecimals);
      await expect(
        privacyTokenBridge
          .connect(user)
          .bridgeNative(amount, user.address, callParams, adapterParamsV1, { value: totalAmount }),
      ).to.be.revertedWith("TokenBridgeBase: adapterParams must be empty");
    });

    it("reverts when useCustomAdapterParams is true and min gas limit isn't set", async () => {
      const adapterParamsV1 = solidityPacked(["uint16", "uint256"], [1, 200000]);
      await privacyTokenBridge.registerToken(wethAddress, wethSharedDecimals);
      await privacyTokenBridge.setUseCustomAdapterParams(true);
      await expect(
        privacyTokenBridge
          .connect(user)
          .bridgeNative(amount, user.address, callParams, adapterParamsV1, { value: totalAmount }),
      ).to.be.revertedWith("LzApp: minGasLimit not set");
    });

    it("reverts when amount is 0", async () => {
      await privacyTokenBridge.registerToken(wethAddress, wethSharedDecimals);

      await expect(
        privacyTokenBridge
          .connect(user)
          .bridgeNative(0, user.address, callParams, adapterParams, { value: totalAmount }),
      ).to.be.revertedWith("PrivacyBridge: invalid amount");
    });

    it("reverts when value is less than amount", async () => {
      await privacyTokenBridge.registerToken(wethAddress, wethSharedDecimals);
      await expect(
        privacyTokenBridge.connect(user).bridgeNative(amount, user.address, callParams, adapterParams, { value: 0 }),
      ).to.be.revertedWith("PrivacyBridge: not enough value sent");
    });

    it("locks WETH in the contract", async () => {
      await privacyTokenBridge.registerToken(wethAddress, wethSharedDecimals);
      await privacyTokenBridge
        .connect(user)
        .bridgeNative(amount, user.address, callParams, adapterParams, { value: totalAmount });

      expect(await privacyTokenBridge.totalValueLockedSD(wethAddress)).to.be.eq(amount);
      expect(await weth.balanceOf(privacyBridgeAddress)).to.be.eq(amount);
    });
  });

  describe("_nonblockingLzReceive", () => {
    let wethAddress: string;
    let totalAmount: any;

    beforeEach(async () => {
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);
      wethAddress = await weth.getAddress();
    });

    it("reverts when received from an unknown chain", async () => {
      await expect(privacyTokenBridge.simulateNonblockingLzReceive(privacyTokenChainId, "0x")).to.be.revertedWith(
        "PrivacyBridge: invalid source chain Id",
      );
    });

    it("reverts when payload has an incorrect packetType", async () => {
      const pkUnknown = 0;
      const payload = createPayload(pkUnknown);
      await expect(privacyTokenBridge.simulateNonblockingLzReceive(wrappedTokenChainId, payload)).to.be.revertedWith(
        "PrivacyBridge: unknown packet type",
      );
    });

    it("reverts when a token is not supported", async () => {
      //Create a new token
      const ERC20Factory = await hre.ethers.getContractFactory("MintableERC20Mock");
      const newToken = await ERC20Factory.deploy("NEW", "NEW");

      const payload = createPayload(pkUnlocking, await newToken.getAddress());
      await expect(privacyTokenBridge.simulateNonblockingLzReceive(wrappedTokenChainId, payload)).to.be.revertedWith(
        "PrivacyBridge: token is not supported",
      );
    });

    it("unlocks, collects withdrawal fees adn transfers fund to the recipient", async () => {
      const LDtoSD = await privacyTokenBridge.LDtoSDConversionRate(privacyTokenAddress);
      const bridgingFee = (await privacyTokenBridge.estimateBridgeFees(false, adapterParams)).nativeFee;
      const withdrawalFee = amount / BigInt(100);
      const withdrawalAmount = amount - withdrawalFee;
      const withdrawalAmountSD = withdrawalAmount / BigInt(LDtoSD);
      const totalAmountSD = amount / BigInt(LDtoSD);

      const payload = createPayload(pkUnlocking, privacyTokenAddress, withdrawalAmountSD, totalAmountSD);

      //Approval
      await privacyToken.connect(user).approve(privacyBridgeAddress, amount);

      //Bridge
      await privacyTokenBridge
        .connect(user)
        .bridge(privacyTokenAddress, amount, user.address, callParams, adapterParams, { value: bridgingFee });

      expect(await privacyToken.balanceOf(user.address)).to.be.eq(0);
      expect(await privacyToken.balanceOf(privacyBridgeAddress)).to.be.eq(amount);

      // Receive
      await privacyTokenBridge.simulateNonblockingLzReceive(wrappedTokenChainId, payload);

      expect(await privacyTokenBridge.totalValueLockedSD(privacyTokenAddress)).to.be.eq(0);
      expect(await privacyToken.balanceOf(privacyBridgeAddress)).to.be.eq(withdrawalFee);
      expect(await privacyToken.balanceOf(user.address)).to.be.eq(withdrawalAmount);
    });

    it("unlock WETH and transfers ETH to the recipient", async () => {
      const bridgingFee = (await privacyTokenBridge.estimateBridgeFees(false, adapterParams)).nativeFee;
      const totalAmount = amount + BigInt(bridgingFee);

      //Setup
      await privacyTokenBridge.registerToken(wethAddress, wethSharedDecimals);

      //Bridge
      await privacyTokenBridge
        .connect(user)
        .bridgeNative(amount, user.address, callParams, adapterParams, { value: totalAmount });
      const recipientBalanceBefore = await hre.ethers.provider.getBalance(user.address);

      //Receive
      await privacyTokenBridge.simulateNonblockingLzReceive(
        wrappedTokenChainId,
        createPayload(pkUnlocking, wethAddress, amount, amount, true),
      );

      expect(await privacyTokenBridge.totalValueLockedSD(wethAddress)).to.be.eq(0);
      expect(await weth.balanceOf(privacyBridgeAddress)).to.be.eq(0);
      expect(await weth.balanceOf(user.address)).to.be.eq(0);
      expect(await hre.ethers.provider.getBalance(user.address)).to.be.eq(recipientBalanceBefore + BigInt(amount));
    });
  });

  describe("withdrawFee", () => {
    beforeEach(async () => {
      await privacyTokenBridge.registerToken(privacyTokenAddress, sharedDecimals);
    });

    it("reverts when called by non owner", async () => {
      await expect(privacyTokenBridge.connect(user).withdrawFee(privacyTokenAddress, owner.address, 1)).to.be.reverted;
    });

    it("reverts when not enough fees collected", async () => {
      await expect(privacyTokenBridge.withdrawFee(privacyTokenAddress, owner.address, 1)).to.be.revertedWith(
        "PrivacyBridge: not enough fees collected",
      );
    });

    it("withdraw Fees", async () => {
      const LDtoSD = await privacyTokenBridge.LDtoSDConversionRate(privacyTokenAddress);

      const bridgingFee = (await privacyTokenBridge.estimateBridgeFees(false, adapterParams)).nativeFee;

      const withdrawalFee = amount / BigInt(100);

      const withdrawalAmountSD = (amount - BigInt(withdrawalFee)) / BigInt(LDtoSD);

      const totalAmountSD = amount / BigInt(LDtoSD);

      await privacyToken.connect(user).approve(privacyBridgeAddress, amount);

      await privacyTokenBridge
        .connect(user)
        .bridge(privacyTokenAddress, amount, user.address, callParams, adapterParams, { value: bridgingFee });
      await privacyTokenBridge.simulateNonblockingLzReceive(
        wrappedTokenChainId,
        createPayload(pkUnlocking, privacyTokenAddress, withdrawalAmountSD, totalAmountSD),
      );

      await privacyTokenBridge.withdrawFee(privacyTokenAddress, owner.address, withdrawalFee);
      expect(await privacyToken.balanceOf(owner.address)).to.be.eq(withdrawalFee);
    });
  });

  describe("privacy Check", () => {
    beforeEach(async () => {
      
    });
  });
});
