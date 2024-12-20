import hre from "hardhat";
import { Pool, MockToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";

const { ethers } = hre;
describe("Pool Contract", () => {
  let pool: Pool;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let initialSupplyOwner: HardhatEthersSigner, contractOwner: HardhatEthersSigner;
  let mockToken: MockToken;

  const tokenSymbol = "ETH";
  const sourceChainId = 31337;
  const tokenAddress = "0xd38E5c25935291fFD51C9d66C3B7384494bb099A";
  const tokenAmount = ethers.parseUnits("1000", 18);
  const MOCKSYMBOL = "MOCK";
  const tokenDecimals = 18;
  const initialSupply = ethers.parseUnits("1000", tokenDecimals);
  const amountToMint = ethers.parseUnits("500", tokenDecimals);

  beforeEach(async () => {
    [owner, user, initialSupplyOwner, contractOwner] = await ethers.getSigners();
    const MockTokenContract = await ethers.getContractFactory("MockToken");
    mockToken = await MockTokenContract.deploy("Mock T", MOCKSYMBOL, tokenDecimals, initialSupply);

    const PoolContract = await ethers.getContractFactory("Pool");
    pool = await PoolContract.deploy();
  });

  //Add A token
  describe("Add Token", async () => {
    it("Allow adding of token by owner", async () => {
      await pool.addToken(tokenSymbol, sourceChainId, tokenAddress);
      let isTokenAdded = await pool.isTokenSupported(tokenSymbol, sourceChainId);
      console.log("Expect Token to be in the list of supported tokens");
      expect(isTokenAdded).to.be.true;
    });

    it("Emit an event adding of token by owner", async () => {
      await pool.addToken(tokenSymbol, sourceChainId, tokenAddress);
      console.log("Should emit and added Event");
      expect("Token Added").to.emit(pool, "TokenAdded");
    });

    it("Should not add token as it is not owner", async () => {
      await expect(pool.connect(user).addToken("USDT", sourceChainId, tokenAddress))
        .to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount")
        .withArgs(user.address);
    });
  });

  //Remove a Token
  describe("Should Remove", async () => {
    it("Remove Token a token after it has been added", async () => {
      await pool.addToken(tokenSymbol, sourceChainId, tokenAddress);
      let isTokenAdded = await pool.isTokenSupported(tokenSymbol, sourceChainId);
      console.log("Expect Token to be in the list of supported tokens");
      expect(isTokenAdded).to.be.true;

      await pool.removeToken(tokenSymbol, sourceChainId);
      let isTokenRemoved = await pool.isTokenSupported(tokenSymbol, sourceChainId);
      console.log("Expect token to be removed");
      expect(isTokenRemoved).to.be.false;

      console.log("Should emit and Removed Event");
      expect("Token Removed").to.emit(pool, "TokenRemoved");
    });
  });
});
