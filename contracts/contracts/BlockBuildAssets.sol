// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

contract BlockBuildGame is ERC1155, Ownable, ERC1155Supply {

    // ────────────────────────────────
    // TOKEN TYPES
    // ────────────────────────────────
    uint256 public constant GOLD = 0;

    uint256 public nextLandId = 1;
    uint256 public nextBuildingId = 10000;

    // ────────────────────────────────
    // STRUCTS
    // ────────────────────────────────
    struct Land {
        string coordinates;
        address owner;
        uint8 sizeLevel;
    }

    struct Building {
        uint256 landId;
        string buildingType;
        uint8 level;
        address owner;
        uint256 lastClaimTime;
    }

    // ────────────────────────────────
    // STORAGE
    // ────────────────────────────────
    mapping(uint256 => Land) public lands;
    mapping(uint256 => Building) public buildings;

    mapping(address => uint256[]) public playerLands;
    mapping(address => uint256[]) public playerBuildings;

    // Prices (in GOLD)
    uint256 public landPrice = 100;
    uint256 public buildingPrice = 50;
    uint256 public upgradeCost = 30;

    // ────────────────────────────────
    // EVENTS
    // ────────────────────────────────
    event Worked(address player, uint256 reward);
    event LandBought(address player, uint256 landId);
    event BuildingConstructed(address player, uint256 buildingId);
    event BuildingUpgraded(uint256 buildingId, uint8 level);
    event IncomeClaimed(address player, uint256 amount);

    // ────────────────────────────────
    // CONSTRUCTOR
    // ────────────────────────────────
    constructor() ERC1155("ipfs://YOUR_METADATA/{id}.json") Ownable() {}

    // ────────────────────────────────
    // 1️⃣ WORK → EARN GOLD
    // ────────────────────────────────
    function work() external {
        uint256 reward = 20;
        _mint(msg.sender, GOLD, reward, "");
        emit Worked(msg.sender, reward);
    }

    // ────────────────────────────────
    // 2️⃣ BUY LAND (NFT)
    // ────────────────────────────────
    function buyLand(string memory coordinates) external {
        require(balanceOf(msg.sender, GOLD) >= landPrice, "Not enough gold");

        _burn(msg.sender, GOLD, landPrice);

        uint256 landId = nextLandId++;

        _mint(msg.sender, landId, 1, "");

        lands[landId] = Land({
            coordinates: coordinates,
            owner: msg.sender,
            sizeLevel: 1
        });

        playerLands[msg.sender].push(landId);

        emit LandBought(msg.sender, landId);
    }

    // ────────────────────────────────
    // 3️⃣ BUILD ON LAND (NFT)
    // ────────────────────────────────
    function build(uint256 landId, string memory buildingType) external {
        require(lands[landId].owner == msg.sender, "Not land owner");
        require(balanceOf(msg.sender, GOLD) >= buildingPrice, "Not enough gold");

        _burn(msg.sender, GOLD, buildingPrice);

        uint256 buildingId = nextBuildingId++;

        _mint(msg.sender, buildingId, 1, "");

        buildings[buildingId] = Building({
            landId: landId,
            buildingType: buildingType,
            level: 1,
            owner: msg.sender,
            lastClaimTime: block.timestamp
        });

        playerBuildings[msg.sender].push(buildingId);

        emit BuildingConstructed(msg.sender, buildingId);
    }

    // ────────────────────────────────
    // 4️⃣ CLAIM PASSIVE INCOME
    // ────────────────────────────────
    function claimIncome(uint256 buildingId) external {
        Building storage b = buildings[buildingId];

        require(b.owner == msg.sender, "Not owner");

        uint256 timePassed = block.timestamp - b.lastClaimTime;

        require(timePassed > 10, "Wait before claiming"); // simple cooldown

        uint256 reward = (b.level * timePassed) / 10;

        b.lastClaimTime = block.timestamp;

        _mint(msg.sender, GOLD, reward, "");

        emit IncomeClaimed(msg.sender, reward);
    }

    // ────────────────────────────────
    // 5️⃣ UPGRADE BUILDING
    // ────────────────────────────────
    function upgradeBuilding(uint256 buildingId) external {
        Building storage b = buildings[buildingId];

        require(b.owner == msg.sender, "Not owner");
        require(balanceOf(msg.sender, GOLD) >= upgradeCost, "Not enough gold");
        require(b.level < 10, "Max level");

        _burn(msg.sender, GOLD, upgradeCost);

        b.level++;

        emit BuildingUpgraded(buildingId, b.level);
    }

    // ────────────────────────────────
    // 6️⃣ UPGRADE LAND SIZE
    // ────────────────────────────────
    function upgradeLand(uint256 landId) external {
        Land storage l = lands[landId];

        require(l.owner == msg.sender, "Not owner");
        require(balanceOf(msg.sender, GOLD) >= upgradeCost, "Not enough gold");
        require(l.sizeLevel < 5, "Max size");

        _burn(msg.sender, GOLD, upgradeCost);

        l.sizeLevel++;
    }

    // ────────────────────────────────
    // VIEW FUNCTIONS
    // ────────────────────────────────
    function getGold(address player) external view returns (uint256) {
        return balanceOf(player, GOLD);
    }

    function getPlayerLands(address player) external view returns (uint256[] memory) {
        return playerLands[player];
    }

    function getPlayerBuildings(address player) external view returns (uint256[] memory) {
        return playerBuildings[player];
    }

    // ────────────────────────────────
    // REQUIRED OVERRIDE
    // ────────────────────────────────
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}