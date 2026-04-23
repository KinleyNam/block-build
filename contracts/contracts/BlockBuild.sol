// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockBuild is ERC1155, Ownable {

    // TOKENS
    uint256 public constant GOLD = 1;

    uint256 public nextLandId = 1000;
    uint256 public nextBuildingId = 2000;

    // STRUCTS    
    struct Land {
        address owner;
    }

    struct Building {
        uint256 landId;
        address owner;
        uint8 level;
    }

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Land) public lands;
    mapping(uint256 => Building) public buildings;
    mapping(uint256 => Listing) public listings;

    // CONSTRUCTOR
    constructor(address owner)
        ERC1155("ipfs://metadata/{id}.json")
        Ownable(owner)
    {}

    // GOLD MINT
    function mintGold(address to, uint256 amount) external onlyOwner {
        _mint(to, GOLD, amount, "");
    }

    // LAND MINT
    function mintLand(address to) external onlyOwner returns (uint256) {
        uint256 id = nextLandId++;

        _mint(to, id, 1, "");
        lands[id] = Land(to);

        return id;
    }

    // BUILDING MINT
    function mintBuilding(address to, uint256 landId)
        external
        onlyOwner
        returns (uint256)
    {
        uint256 id = nextBuildingId++;

        _mint(to, id, 1, "");
        buildings[id] = Building(landId, to, 1);

        return id;
    }

    // UPGRADE BUILDING
    function upgradeBuilding(uint256 id) external {
        require(buildings[id].owner != address(0), "Does not exist");
        require(buildings[id].owner == msg.sender, "Not owner");
        require(buildings[id].level < 3, "Max level reached");
        buildings[id].level++;
    }

    // LIST LAND / BUILDING
    function listAsset(uint256 assetId, uint256 price) external {
        require(balanceOf(msg.sender, assetId) > 0, "Not owner");

        listings[assetId] = Listing(msg.sender, price, true);
    }

    // BUY LAND / BUILDING
    function buyAsset(uint256 assetId) external {
        Listing memory item = listings[assetId];
        require(item.active, "Not for sale");

        require(
            balanceOf(msg.sender, GOLD) >= item.price,
            "Not enough GOLD"
        );

        // pay GOLD
        _safeTransferFrom(msg.sender, item.seller, GOLD, item.price, "");

        // transfer asset
        _safeTransferFrom(item.seller, msg.sender, assetId, 1, "");

        listings[assetId].active = false;

        if (assetId >= 2000) buildings[assetId].owner = msg.sender;
        else if (assetId >= 1000) lands[assetId].owner = msg.sender;
    }
}