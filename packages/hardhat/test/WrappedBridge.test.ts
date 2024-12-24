import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { AbiCoder, parseEther, solidityPacked, ZeroAddress } from "ethers";
import hre from "hardhat";
import { MintableERC20Mock } from "../typechain-types";

describe("WrappedTokenBridge", () => {
  const privacyTokenChainId = 0;
  const wrappedTokenChainId = 1;
  const amount = parseEther("10");
  const pkMint = 0;

  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let wrappedTokenBridge: any;
  let privacyToken: MintableERC20Mock;
  let wrappedToken: MintableERC20Mock;
  let wrappedTokenEndpoint, wrappedTokenBridgeFactory;
  let callParams: any, adapterParams: any;
  let privacyTokenAddress;

  const createPayload = async (pk = pkMint, token?: string) => {
    if (!token) {
      token = await privacyToken.getAddress();
    }
    const abicoder = new AbiCoder();
    return abicoder.encode(["uint8", "address", "address", "uint256"], [pk, token, user.address, amount]);
  };

  beforeEach(async () => {
    [owner, user] = await hre.ethers.getSigners();

    const endpointFactory = await hre.ethers.getContractFactory("LayerZeroEndpointStub");
    const privacyTokenEndpoint = await endpointFactory.deploy();
    wrappedTokenEndpoint = await endpointFactory.deploy();

    const wethFactory = await hre.ethers.getContractFactory("WETHT");
    const weth = await wethFactory.deploy();

    const privacyBridgeFactory = await hre.ethers.getContractFactory("PrivacyBridge");
    const privacyTokenBridge = await privacyBridgeFactory.deploy(
      await privacyTokenEndpoint.getAddress(),
      wrappedTokenChainId,
      await weth.getAddress(),
    );

    wrappedTokenBridgeFactory = await hre.ethers.getContractFactory("WrappedBridgeHarness");
    wrappedTokenBridge = await wrappedTokenBridgeFactory.deploy(await wrappedTokenEndpoint.getAddress());

    const ERC20Factory = await hre.ethers.getContractFactory("MintableERC20Mock");
    privacyToken = await ERC20Factory.deploy("TEST", "TEST");
    const privacyTokenERC20Decimals = await privacyToken.decimals();

    const wrappedERC20Factory = await hre.ethers.getContractFactory("WrappedERC20");
    wrappedToken = await wrappedERC20Factory.deploy(
      await wrappedTokenBridge.getAddress(),
      "WTEST",
      "WTEST",
      privacyTokenERC20Decimals,
    );

    await wrappedTokenBridge.setTrustedRemoteAddress(privacyTokenChainId, await privacyTokenBridge.getAddress());

    callParams = { refundAddress: user.address, zroPaymentAddress: ZeroAddress };

    adapterParams = "0x";
  });

  it("doesn't renounce ownership", async () => {
    await expect(wrappedTokenBridge.renounceOwnership()).to.be.revertedWith(
      "TokenBridgeBase: Ownership renouncement is disabled",
    );
  });

  describe("WrappedregisterToken", () => {
    it("reverts when called by non owner", async () => {
      expect(
        wrappedTokenBridge
          .connect(user)
          .registerToken(await wrappedToken.getAddress(), privacyTokenChainId, await privacyToken.getAddress()),
      ).to.be.reverted;
    });

    it("reverts when local token is address zero", async () => {
      await expect(
        wrappedTokenBridge.registerToken(ZeroAddress, privacyTokenChainId, await privacyToken.getAddress()),
      ).to.be.revertedWith("WrappedBridge: invalid local token address");
    });

    it("reverts when remote token is address zero", async () => {
      await expect(
        wrappedTokenBridge.registerToken(await wrappedToken.getAddress(), privacyTokenChainId, ZeroAddress),
      ).to.be.revertedWith("WrappedBridge: invalid local token address");
    });

    it("reverts if token already registered", async () => {
      await wrappedTokenBridge.registerToken(
        await wrappedToken.getAddress(),
        privacyTokenChainId,
        await privacyToken.getAddress(),
      );
      await expect(
        wrappedTokenBridge.registerToken(
          await wrappedToken.getAddress(),
          privacyTokenChainId,
          await privacyToken.getAddress(),
        ),
      ).to.be.revertedWith("WrappedBridge: token already registered");
    });

    it("registers tokens", async () => {
      await wrappedTokenBridge.registerToken(
        await wrappedToken.getAddress(),
        privacyTokenChainId,
        await privacyToken.getAddress(),
      );

      expect(await wrappedTokenBridge.localToRemote(await wrappedToken.getAddress(), privacyTokenChainId)).to.be.eq(
        await privacyToken.getAddress(),
      );
      expect(await wrappedTokenBridge.remoteToLocal(await privacyToken.getAddress(), privacyTokenChainId)).to.be.eq(
        await wrappedToken.getAddress(),
      );
    });
  });

  describe("setWithdrawalFeeBps", () => {
    const withdrawalFeeBps = 10;
    it("reverts when fee bps is greater than or equal to 100%", async () => {
      await expect(wrappedTokenBridge.setWithdrawalFeeBps(10000)).to.be.revertedWith(
        "WrappedBridge: invalid withdrawal fee bps",
      );
    });

    it("reverts when called by non owner", async () => {
      await expect(wrappedTokenBridge.connect(user).setWithdrawalFeeBps(withdrawalFeeBps)).to.be.reverted;
    });

    it("sets withdrawal fee bps", async () => {
      await wrappedTokenBridge.setWithdrawalFeeBps(withdrawalFeeBps);
      expect(await wrappedTokenBridge.withdrawalFeeBps()).to.be.eq(withdrawalFeeBps);
    });
  });

  describe("_nonblockingLzReceive", () => {
    it("reverts when payload has incorrect packet type", async () => {
      const pkInvalid = 1;
      await expect(
        wrappedTokenBridge.simulateNonBlockingLzReceive(privacyTokenChainId, await createPayload(pkInvalid)),
      ).to.be.revertedWith("WrappedBridge: Unknown packet type");
    });

    it("reverts when tokens aren't registered", async () => {
      await expect(
        wrappedTokenBridge.simulateNonBlockingLzReceive(privacyTokenChainId, createPayload()),
      ).to.be.revertedWith("WrappedBridge: token is not supported");
    });

    it("mints wrapped tokens", async () => {
      await wrappedTokenBridge.registerToken(
        await wrappedToken.getAddress(),
        privacyTokenChainId,
        await privacyToken.getAddress(),
      );
      await wrappedTokenBridge.simulateNonBlockingLzReceive(
        privacyTokenChainId,
        createPayload(0, await privacyToken.getAddress()),
      );

      expect(await wrappedToken.totalSupply()).to.be.eq(amount);
      expect(await wrappedToken.balanceOf(user.address)).to.be.eq(amount);
      expect(await wrappedTokenBridge.totalValueLocked(privacyTokenChainId, await privacyToken.getAddress())).to.be.eq(
        amount,
      );
    });
  });

  describe("wrappedbridge", () => {
    let fee: any;
    beforeEach(async () => {
      fee = (await wrappedTokenBridge.estimateBridgeFees(privacyTokenChainId, false, adapterParams)).nativeFee;
    });

    it("reverts when token is address zero", async () => {
      await expect(
        wrappedTokenBridge
          .connect(user)
          .bridge(ZeroAddress, privacyTokenChainId, amount, user.address, false, callParams, adapterParams, {
            value: fee,
          }),
      ).to.be.revertedWith("WrappedBridge: invalid token");
    });

    it("reverts when the to address is zero", async () => {
      await expect(
        wrappedTokenBridge
          .connect(user)
          .bridge(
            await wrappedToken.getAddress(),
            privacyTokenChainId,
            amount,
            ZeroAddress,
            false,
            callParams,
            adapterParams,
            { value: fee },
          ),
      ).to.be.revertedWith("WrappedBridge: invalid to");
    });

    it("reverts when useCustomAdapterParams is false and non-empty adapterParams are passed", async () => {
      const adapterParamsV1 = solidityPacked(["uint16", "uint256"], [1, 200000]);
      await expect(
        wrappedTokenBridge
          .connect(user)
          .bridge(
            await wrappedToken.getAddress(),
            privacyTokenChainId,
            amount,
            user.address,
            false,
            callParams,
            adapterParamsV1,
            { value: fee },
          ),
      ).to.be.revertedWith("TokenBridgeBase: adapterParams must be empty");
    });

    it("reverts when token is not registered", async () => {
      await expect(
        wrappedTokenBridge
          .connect(user)
          .bridge(
            await wrappedToken.getAddress(),
            privacyTokenChainId,
            amount,
            user.address,
            false,
            callParams,
            adapterParams,
            {
              value: fee,
            },
          ),
      ).to.be.revertedWith("WrappedBridge: token is not supported");
    });

    it("reverts when amount is 0", async () => {
      await wrappedTokenBridge.registerToken(
        await wrappedToken.getAddress(),
        privacyTokenChainId,
        await privacyToken.getAddress(),
      );
      await expect(
        wrappedTokenBridge
          .connect(user)
          .bridge(
            await wrappedToken.getAddress(),
            privacyTokenChainId,
            0,
            user.address,
            false,
            callParams,
            adapterParams,
            {
              value: fee,
            },
          ),
      ).to.be.revertedWith("Wrapped bridge: Invalid amount");
    });

    it("burns wrapped tokens", async () => {
      await wrappedTokenBridge.registerToken(
        await wrappedToken.getAddress(),
        privacyTokenChainId,
        await privacyToken.getAddress(),
      );

      // Tokens minted
      await wrappedTokenBridge.simulateNonBlockingLzReceive(privacyTokenChainId, createPayload());

      console.log("Get the wrapped Token total supply", await wrappedToken.totalSupply());
      expect(await wrappedToken.totalSupply()).to.be.eq(amount);
      console.log("get the supply of the user", await wrappedToken.balanceOf(user.address));
      expect(await wrappedToken.balanceOf(user.address)).to.be.eq(amount);
      console.log(
        "Get the total value locked",
        await await wrappedTokenBridge.totalValueLocked(privacyTokenChainId, await privacyToken.getAddress()),
      );
      console.log(await wrappedTokenBridge.totalValueLocked(privacyTokenChainId, await privacyToken.getAddress()));
      expect(await wrappedTokenBridge.totalValueLocked(privacyTokenChainId, await privacyToken.getAddress())).to.be.eq(
        amount,
      );

      // Tokens burned
      console.log("burn the wrapped tokens");
      await wrappedTokenBridge
        .connect(user)
        .bridge(
          await wrappedToken.getAddress(),
          privacyTokenChainId,
          amount,
          user.address,
          false,
          callParams,
          adapterParams,
          {
            value: fee,
          },
        );
      console.log(await wrappedTokenBridge.totalValueLocked(privacyTokenChainId, await privacyToken.getAddress()));
      console.log("Check the total supply of the wrapped token");
      expect(await wrappedToken.totalSupply()).to.be.eq(0);
      expect(await wrappedToken.balanceOf(user.address)).to.be.eq(0);
      expect(await wrappedTokenBridge.totalValueLocked(privacyTokenChainId, await privacyToken.getAddress())).to.be.eq(
        0,
      );
    });
  });
});
