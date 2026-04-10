const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockBuild Contract", function () {
  let blockBuild;
  let owner;
  let player1;
  let player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const BlockBuild = await ethers.getContractFactory("BlockBuild");

    blockBuild = await BlockBuild.deploy(owner.address);

    await blockBuild.waitForDeployment();
  });

  it("Should mint GOLD to a player", async function () {
    await blockBuild.rewardGold(player1.address, 100);

    const balance = await blockBuild.balanceOf(player1.address, 1);

    expect(balance).to.equal(100);
  });

  it("Should mint LAND NFT", async function () {
    await blockBuild.mintLand(player1.address, "10,20");

    const landId = 1000;

    const land = await blockBuild.lands(landId);

    expect(land.owner).to.equal(player1.address);

    const balance = await blockBuild.balanceOf(player1.address, landId);

    expect(balance).to.equal(1);
  });

  it("Should construct building on land", async function () {
    await blockBuild.mintLand(player1.address, "10,20");

    await blockBuild.constructBuilding(player1.address, 1000, "house");

    const building = await blockBuild.buildings(2000);

    expect(building.owner).to.equal(player1.address);
    expect(building.landId).to.equal(1000);
  });

  it("Should upgrade building", async function () {
    await blockBuild.mintLand(player1.address, "10,20");

    await blockBuild.constructBuilding(player1.address, 1000, "house");

    await blockBuild.connect(player1).upgradeBuilding(2000);

    const building = await blockBuild.buildings(2000);

    expect(building.level).to.equal(2);
  });

  it("Should list land in marketplace", async function () {
    await blockBuild.mintLand(player1.address, "10,20");

    await blockBuild.connect(player1).listAsset(1000, 50);

    const price = await blockBuild.marketPrice(1000);

    expect(price).to.equal(50);
  });

  it("Should buy land using GOLD", async function () {
    // give gold to buyer
    await blockBuild.rewardGold(player2.address, 100);

    // mint land
    await blockBuild.mintLand(player1.address, "10,20");

    // list land
    await blockBuild.connect(player1).listAsset(1000, 50);

    // seller approves contract to transfer land
    await blockBuild
      .connect(player1)
      .setApprovalForAll(blockBuild.target, true);

    // buyer approves contract to transfer GOLD
    await blockBuild
      .connect(player2)
      .setApprovalForAll(blockBuild.target, true);

    // buy asset
    await blockBuild.connect(player2).buyAsset(1000);

    const land = await blockBuild.lands(1000);

    expect(land.owner).to.equal(player2.address);
  });
});
