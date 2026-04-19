const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockBuildGame", function () {
  let game;
  let owner, player;

  beforeEach(async function () {
    [owner, player] = await ethers.getSigners();

    const Game = await ethers.getContractFactory("BlockBuildGame");
    game = await Game.deploy();
    await game.waitForDeployment();
  });

  // ────────────────────────────────
  // TEST: Work → Earn Gold
  // ────────────────────────────────
  it("Player should earn gold by working", async function () {
    await game.connect(player).work();

    const balance = await game.balanceOf(player.address, 0); // GOLD = 0
    expect(balance).to.equal(20);
  });

  // ────────────────────────────────
  // TEST: Buy Land
  // ────────────────────────────────
  it("Player should buy land after earning gold", async function () {
    await game.connect(player).work();
    await game.connect(player).work();
    await game.connect(player).work();
    await game.connect(player).work();
    await game.connect(player).work(); // 100 gold

    await game.connect(player).buyLand("X:10,Y:20");

    const lands = await game.getPlayerLands(player.address);
    expect(lands.length).to.equal(1);
  });

  // ────────────────────────────────
  // TEST: Build on Land
  // ────────────────────────────────
  it("Player should build on owned land", async function () {
    // Earn gold
    for (let i = 0; i < 10; i++) {
      await game.connect(player).work();
    }

    // Buy land
    await game.connect(player).buyLand("X:1,Y:1");

    // Build
    await game.connect(player).build(1, "House");

    const buildings = await game.getPlayerBuildings(player.address);
    expect(buildings.length).to.equal(1);
  });

  // ────────────────────────────────
  // TEST: Upgrade Building
  // ────────────────────────────────
  it("Player should upgrade building", async function () {
    for (let i = 0; i < 10; i++) {
      await game.connect(player).work();
    }

    await game.connect(player).buyLand("X:5,Y:5");
    await game.connect(player).build(1, "House");

    await game.connect(player).upgradeBuilding(10000);

    const building = await game.buildings(10000);
    expect(building.level).to.equal(2);
  });

  // ────────────────────────────────
  // TEST: Claim Income
  // ────────────────────────────────
  it("Player should claim income from building", async function () {
    for (let i = 0; i < 10; i++) {
      await game.connect(player).work();
    }

    await game.connect(player).buyLand("X:3,Y:3");
    await game.connect(player).build(1, "Factory");

    // wait time (simulate blockchain time)
    await ethers.provider.send("evm_increaseTime", [20]);
    await ethers.provider.send("evm_mine");

    await game.connect(player).claimIncome(10000);

    const gold = await game.balanceOf(player.address, 0);
    expect(gold).to.be.gt(0);
  });

  // ────────────────────────────────
  // TEST: Upgrade Land
  // ────────────────────────────────
  it("Player should upgrade land size", async function () {
    for (let i = 0; i < 10; i++) {
      await game.connect(player).work();
    }

    await game.connect(player).buyLand("X:7,Y:7");

    await game.connect(player).upgradeLand(1);

    const land = await game.lands(1);
    expect(land.sizeLevel).to.equal(2);
  });
});