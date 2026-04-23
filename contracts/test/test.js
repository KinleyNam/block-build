const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockBuild Contract", function () {
  let BlockBuild, contract;
  let owner, player1, player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    BlockBuild = await ethers.getContractFactory("BlockBuild");
    contract = await BlockBuild.deploy(owner.address);
    await contract.waitForDeployment();
  });

  // GOLD MINT TEST
  it("Should mint GOLD to player", async function () {
    await contract.mintGold(player1.address, 1000);

    const balance = await contract.balanceOf(player1.address, 1);
    expect(balance).to.equal(1000);
  });

  // LAND MINT TEST
  it("Should mint LAND", async function () {
    await contract.mintLand(player1.address);

    const landBalance = await contract.balanceOf(player1.address, 1000);
    expect(landBalance).to.equal(1);
  });

  // BUILDING MINT TEST
  it("Should mint BUILDING", async function () {
    await contract.mintLand(player1.address);
    await contract.mintBuilding(player1.address, 1000);

    const buildingBalance = await contract.balanceOf(player1.address, 2000);
    expect(buildingBalance).to.equal(1);
  });

  // UPGRADE BUILDING
  it("Should upgrade building", async function () {
    await contract.mintLand(player1.address);
    await contract.mintBuilding(player1.address, 1000);

    await contract.connect(player1).upgradeBuilding(2000);

    const building = await contract.buildings(2000);
    expect(building.level).to.equal(2);
  });

  // LIST ASSET
  it("Should list LAND for sale", async function () {
    await contract.mintLand(player1.address);

    await contract.connect(player1).listAsset(1000, 50);

    const listing = await contract.listings(1000);

    expect(listing.active).to.equal(true);
    expect(listing.price).to.equal(50);
  });

  // BUY ASSET
  it("Should buy LAND using GOLD", async function () {
    await contract.mintLand(player1.address);
    await contract.mintGold(player2.address, 1000);

    await contract.connect(player1).listAsset(1000, 100);

    await contract.connect(player2).buyAsset(1000);

    const newOwnerBalance = await contract.balanceOf(player2.address, 1000);
    expect(newOwnerBalance).to.equal(1);

    const sellerGold = await contract.balanceOf(player1.address, 1);
    expect(sellerGold).to.equal(100);
  });
  // MAX LEVEL CAP TEST
  it("Should not upgrade building beyond level 3", async function () {
    await contract.mintLand(player1.address);
    await contract.mintBuilding(player1.address, 1000);

    await contract.connect(player1).upgradeBuilding(2000); // level 2
    await contract.connect(player1).upgradeBuilding(2000); // level 3

    await expect(
      contract.connect(player1).upgradeBuilding(2000), // should fail
    ).to.be.revertedWith("Max level reached");
  });
});
