import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Verifier } from "../typechain-types";
import hre from "hardhat";
import { expect } from "chai";

const { ethers } = hre;

describe("Verifier Contract", () => {
  let verifier: Verifier;
  let owner: HardhatEthersSigner;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    const VerifierContract = await ethers.getContractFactory("Verifier");
    verifier = await VerifierContract.deploy();
  });

  it("Should deploy the verifier contract", async () => {
    expect(await verifier.getAddress()).to.be.properAddress;
  });

  it("Should Verify Prove ", async () => {
    const tx = await verifier.verifyProof(
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
    expect(tx).to.be.true;
  });

  it("Should not verify prove", async () => {
    const tx = await verifier.verifyProof(
      ["0x01bf4a8a8dec1dd12ef9bdd9b97f", "0x1368e942f24a83232c25744287f31ea989f9fa2d7ae458d80"],
      [
        [
          "0x0cb7e836839a6c051754454fece16e30e1ec349b8e98e27bc04",
          "0x1d1b7a9fad1612351ee2b5a1e58b627ee0507bcf633769137457",
        ],
        [
          "0x1db2498e0635a30512c94e85d5fa857879442966db3e26d082765",
          "0x0a4b7d337bc451a8ac2f0812fafd421137bfa95d60977e0619ddea",
        ],
      ],
      [
        "0x1300005a14ba2f6dac28150a620eeca588a65b8cd3657c9021ab14",
        "0x08e0feb1d9a4ba14fda1ef4e62fdb70bb78a965c233596ac2f162c48",
      ],
      ["0x2d0d36902b523b5dbfc3a3c101a12a4f6118ae9a91ed5e55dcdb09e8ab"],
    );
    expect(tx).to.be.false;
  });
});
