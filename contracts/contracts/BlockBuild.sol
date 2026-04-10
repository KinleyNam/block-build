// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockBuild is ERC1155, ERC1155Supply, Ownable {
    // ----------------------------
    // TOKEN IDS
    // ----------------------------

    uint256 public constant GOLD = 1;

    uint256 public nextLandId = 1000;
    uint256 public nextBuildingId = 2000;

    // ----------------------------
    // STRUCTS
    // ----------------------------

    struct Land {
        string coordinates;
        address owner;
        bool forSale;
    }

    struct Building {
        uint256 landId;
        string category;
        uint8 level;
        address owner;
        bool forSale;
    }

    // ----------------------------
    // STORAGE
    // ----------------------------

    mapping(uint256 => Land) public lands;
    mapping(uint256 => Building) public buildings;

    mapping(uint256 => uint256) public marketPrice;

    // ----------------------------
    // EVENTS
    // ----------------------------

    event LandMinted(uint256 landId, address owner);
    event BuildingConstructed(uint256 buildingId, uint256 landId);
    event BuildingUpgraded(uint256 buildingId, uint8 level);
    event AssetListed(uint256 assetId, uint256 price);
    event AssetPurchased(uint256 assetId, address seller, address buyer);

    // ----------------------------
    // CONSTRUCTOR
    // ----------------------------

    constructor(
        address initialOwner
    ) ERC1155("ipfs://YOUR_METADATA/{id}.json") Ownable(initialOwner) {}

    // ----------------------------
    // GOLD TOKEN
    // ----------------------------

    function rewardGold(address player, uint256 amount) external onlyOwner {
        _mint(player, GOLD, amount, "");
    }

    // ----------------------------
    // LAND NFT
    // ----------------------------

    function mintLand(
        address player,
        string memory coords
    ) external onlyOwner returns (uint256) {
        uint256 landId = nextLandId++;

        _mint(player, landId, 1, "");

        lands[landId] = Land(coords, player, false);

        emit LandMinted(landId, player);

        return landId;
    }

    // ----------------------------
    // BUILDING NFT
    // ----------------------------

    function constructBuilding(
        address player,
        uint256 landId,
        string memory category
    ) external onlyOwner returns (uint256) {
        require(lands[landId].owner == player, "Not land owner");

        uint256 buildingId = nextBuildingId++;

        _mint(player, buildingId, 1, "");

        buildings[buildingId] = Building(landId, category, 1, player, false);

        emit BuildingConstructed(buildingId, landId);

        return buildingId;
    }

    function upgradeBuilding(uint256 buildingId) external {
        Building storage b = buildings[buildingId];

        require(b.owner == msg.sender, "Not owner");
        require(b.level < 10, "Max level");

        b.level++;

        emit BuildingUpgraded(buildingId, b.level);
    }

    // ----------------------------
    // MARKETPLACE
    // ----------------------------

    function listAsset(uint256 assetId, uint256 price) external {
        if (assetId >= 1000 && assetId < 2000) {
            require(lands[assetId].owner == msg.sender, "Not land owner");
            lands[assetId].forSale = true;
        } else {
            require(
                buildings[assetId].owner == msg.sender,
                "Not building owner"
            );
            buildings[assetId].forSale = true;
        }

        marketPrice[assetId] = price;

        emit AssetListed(assetId, price);
    }

    function buyAsset(uint256 assetId) external {
        uint256 price = marketPrice[assetId];

        require(balanceOf(msg.sender, GOLD) >= price, "Not enough GOLD");

        address seller;

        if (assetId >= 1000 && assetId < 2000) {
            Land storage land = lands[assetId];
            require(land.forSale, "Not for sale");

            seller = land.owner;

            land.owner = msg.sender;
            land.forSale = false;
        } else {
            Building storage building = buildings[assetId];
            require(building.forSale, "Not for sale");

            seller = building.owner;

            building.owner = msg.sender;
            building.forSale = false;
        }

        // transfer GOLD to seller
        safeTransferFrom(msg.sender, seller, GOLD, price, "");

        // transfer NFT asset
        safeTransferFrom(seller, msg.sender, assetId, 1, "");

        emit AssetPurchased(assetId, seller, msg.sender);
    }

    // ----------------------------
    // REQUIRED OVERRIDE
    // ----------------------------

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, amounts);
    }
}
