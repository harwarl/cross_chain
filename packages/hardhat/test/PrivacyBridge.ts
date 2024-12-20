import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import { MockToken, Pool, PrivacyBridge, ReceiptVerifier, Verifier } from "../typechain-types";
import { expect } from "chai";

const { ethers } = hre;

describe("Privacy Bridge", () => {
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let pool: Pool;
  let privacyBridge: PrivacyBridge;
  let receiptVerifier: ReceiptVerifier;
  let verifier: Verifier;
  let mockToken: MockToken;
  let mockDecimals = 8;
  let initialSupply = ethers.parseUnits("1000", mockDecimals);
  let amountToMint = ethers.parseUnits("300", mockDecimals);

  let sendSymbol = "Mock";

  beforeEach(async () => {
    //Set up the privacy Bridge, the ReceiptVerifier, the pool and the Mock Token Contracts
    [owner, user, recipient] = await ethers.getSigners();

    //Verifier
    const verifierContract = await ethers.getContractFactory("Verifier");
    verifier = await verifierContract.deploy();

    //Receipt Verifier
    const receiptVerifierContract = await ethers.getContractFactory("ReceiptVerifier");
    receiptVerifier = await receiptVerifierContract.deploy();

    // Mock Token
    const mockTokenContract = await ethers.getContractFactory("MockToken");
    mockToken = await mockTokenContract.deploy("Mock", sendSymbol, mockDecimals, initialSupply);

    //Pool
    const poolContract = await ethers.getContractFactory("Pool");
    pool = await poolContract.deploy();

    //Privacy Bridge
    const privacyBridgeContract = await ethers.getContractFactory("PrivacyBridge");
    privacyBridge = await privacyBridgeContract.deploy(await receiptVerifier.getAddress());

    await privacyBridge.addToken(sendSymbol, 31337, await mockToken.getAddress());
  });

  it("should deploy the privacy bridge", async () => {
    expect(await privacyBridge.getAddress()).to.be.properAddress;
  });

  it("should have the mock token added to the pool", async () => {
    expect(await privacyBridge.isTokenSupported(sendSymbol, 31337)).to.be.true;
  });

  describe("Send Token", () => {
    let ownerBalanceBefore: any, userBalanceBefore: any;
    beforeEach(async () => {
      ownerBalanceBefore = await mockToken.balanceOf(owner);
      userBalanceBefore = await mockToken.balanceOf(user);

      console.log({ ownerBalanceBefore, userBalanceBefore });
    });

    it("should send a token when provided with the verifiers", async () => {
      const tx = await privacyBridge.send(
        sendSymbol,
        owner,
        amountToMint,
        user,
        1,
        [
          "0x01bf4a8a8dec1dd12ef9bdd9b9d392666747f0adead5d5baef9d98ff0d7d127f",
          "0x1368e942f24a83232c2574428778b8bcc603feba0f31ea989f9fa2d7ae458d80",
        ],
        [
          [
            "0x0cb7e836839a6c051754454fba35337e81448ece16e30e1ec349b8e98e27bc04",
            "0x1d1b7a9fad1612351ee2b5a78e07c0301181e58b627ee0507bcf633769137457",
          ],
          [
            "0x1db2498e0635a30512c94e8531ccf2c5920d5fa857879442966db3e26d082765",
            "0x0a4b7d337bc451a8ac2f0812fafd42994808555a1137bfa95d60977e0619ddea",
          ],
        ],
        [
          "0x1300005a14ba2f6dac28150a620eeca58098ffe5bfb8a65b8cd3657c9021ab14",
          "0x08e0feb1d9a4ba14fda1ef4e62fdb70bb27a3b7b778a965c233596ac2f162c48",
        ],
        ["0x2d0d36902b523b5dbfc3a3c101a12a4fa12a466118ae9a91ed5e55dcdb09e8ab"],
      );

      tx.wait();

      const ownerBalanceAfter = await mockToken.balanceOf(owner);
      const userBalanceAfter = await mockToken.balanceOf(user);

      // Log balance after transfer for debugging
      console.log({
        ownerBalanceAfter: ownerBalanceAfter.toString(),
        userBalanceAfter: userBalanceAfter.toString(),
      });

      expect(ownerBalanceAfter).to.equal((ownerBalanceBefore - amountToMint).toString());

      


    //   const tx = await privacyBridge.claim()
    });
  });
});
