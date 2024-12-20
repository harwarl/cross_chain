import hre from "hardhat";
import { ReceiptVerifier } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";

const { ethers } = hre;

describe("Receipt Verifier Contract", () => {
  let receiptVerifier: ReceiptVerifier;
  let owner: HardhatEthersSigner;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    const ReceiptVerifierContract = await ethers.getContractFactory("ReceiptVerifier");
    receiptVerifier = await ReceiptVerifierContract.deploy();
  });

  it("Should deploy the receipt verifier contract", async () => {
    expect(await receiptVerifier.getAddress()).to.be.properAddress;
  });

  it("Should process a valid receipt without errors", async () => {
    const tx = await receiptVerifier._useReceipt(
      {
        from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        tokenSymbol: "ETH",
        amount: 3,
        chainFrom: 31337,
        chainTo: 2,
        timestamp: Math.floor(Date.now() / 1000),
        publicInputs: ["0x2d0d36902b523b5dbfc3a3c101a12a4fa12a466118ae9a91ed5e55dcdb09e8ab"],
      },
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
    );

    expect(tx).to.be.an("object");
    expect(tx).to.have.property("hash");
    expect(tx.hash).to.be.a("string").that.has.lengthOf(66);
    await expect(tx.wait()).to.not.be.reverted;
  });

  it("Should throw an error when using the same receipt", async () => {
    // First use of the receipt
    await receiptVerifier._useReceipt(
      {
        from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        tokenSymbol: "ETH",
        amount: 3,
        chainFrom: 31337,
        chainTo: 2,
        timestamp: Math.floor(Date.now() / 1000),
        publicInputs: ["0x2d0d36902b523b5dbfc3a3c101a12a4fa12a466118ae9a91ed5e55dcdb09e8ab"],
      },
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
    );

    // Attempt to reuse the same receipt
    await expect(
      receiptVerifier._useReceipt(
        {
          from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          tokenSymbol: "ETH",
          amount: 3,
          chainFrom: 31337,
          chainTo: 2,
          timestamp: Math.floor(Date.now() / 1000),
          publicInputs: ["0x2d0d36902b523b5dbfc3a3c101a12a4fa12a466118ae9a91ed5e55dcdb09e8ab"],
        },
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
      ),
    ).to.be.revertedWith("Receipt Verifier: Already Processed Receipt");
  });
});
