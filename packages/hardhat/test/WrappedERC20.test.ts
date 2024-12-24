import hre from "hardhat";
import { expect } from "chai";
import { WrappedERC20 } from "../typechain-types";
import { beforeEach } from "mocha";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import ethers from "ethers";

describe("WRAPPEDERC20", () => {
  const name = "WTEST";
  const symbol = "WTEST";
  const decimals = 18;
  const amount = 10n ** 18n;

  let owner: HardhatEthersSigner, bridge: HardhatEthersSigner;
  let wrappedTokenFactory: any;
  let wrappedToken: WrappedERC20;
  let addressZero: string = "0x0000000000000000000000000000000000000000";

  beforeEach(async () => {
    [owner, bridge] = await hre.ethers.getSigners();
    wrappedTokenFactory = await hre.ethers.getContractFactory("WrappedERC20");
    wrappedToken = (await wrappedTokenFactory.deploy(bridge.address, name, symbol, decimals)) as WrappedERC20;
    // await wrappedToken.waitForDeployment();
  });

  it("reverts when passing address zero in the constructor", async () => {
    await expect(wrappedTokenFactory.deploy(addressZero, name, symbol, decimals)).to.be.revertedWith(
      "WrappedERC20: invalid bridge",
    );
  });

  it("overrides the default ERC20 number of decimals with the one passed in the constructor", async () => {
    const customDecimals = 6;
    wrappedToken = await wrappedTokenFactory.deploy(bridge.address, name, symbol, customDecimals);
    expect(await wrappedToken.decimals()).to.be.eq(customDecimals);
  });

  describe("mint", () => {
    it("reverts when not called by the bridge", async () => {
      expect(wrappedToken.mint(owner.address, amount)).to.be.revertedWith("WrappedERC20: caller is not the bridge");
    });

    it("mints wrapped tokens", async () => {
      await wrappedToken.connect(bridge).mint(owner.address, amount);
      expect(await wrappedToken.totalSupply()).to.be.eq(amount);
      expect(await wrappedToken.balanceOf(owner.address)).to.be.eq(amount);
    });
  });

  describe("burn", () => {
    beforeEach(async () => {
      await wrappedToken.connect(bridge).mint(owner.address, amount);
    });

    it("reverts when not called by the bridge", async () => {
      await expect(wrappedToken.burn(owner.address, amount)).to.be.revertedWith("WrappedERC20: caller is not bridge");
    });

    it("burns wrapped tokens", async () => {
      await wrappedToken.connect(bridge).burn(owner.address, amount);
      expect(await wrappedToken.totalSupply()).to.be.eq(0);
      expect(await wrappedToken.balanceOf(owner.address)).to.be.eq(0);
    });
  });
});
