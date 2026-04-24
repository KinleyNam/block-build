// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
contract BlockBuild is ERC1155, ERC1155Supply, Ownable, ReentrancyGuard {
    // TOKEN TYPES
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

    constructor(
        address initialOwner
    ) ERC1155("ipfs://metadata/{id}.json") Ownable(initialOwner) {}

    // GOLD
    function mintGold(address to, uint256 amount) external onlyOwner {
        _mint(to, GOLD, amount, "");
    }

    // LAND
    function mintLand(address to) external onlyOwner returns (uint256) {
        uint256 id = nextLandId++;

        _mint(to, id, 1, "");
        lands[id] = Land({owner: to});
        return id;
    }

    // BUILDING
    function mintBuilding(
        address to,
        uint256 landId
    ) external onlyOwner returns (uint256) {
        require(lands[landId].owner != address(0), "Land does not exist");
        require(lands[landId].owner == to, "Not land owner");

        uint256 id = nextBuildingId++;

        _mint(to, id, 1, "");
        buildings[id] = Building(landId, to, 1);

        return id;
    }

    // UPGRADE
    function upgradeBuilding(uint256 id) external {
        Building storage b = buildings[id];

        require(b.owner != address(0), "Building not found");
        require(b.owner == msg.sender, "Not owner");
        require(b.level < 3, "Max level reached");

        b.level++;
    }

    // LIST
    function listAsset(uint256 assetId, uint256 price) external {
        require(balanceOf(msg.sender, assetId) > 0, "Not owner");
        require(price > 0, "Price must be > 0");
        require(!listings[assetId].active, "Already listed");

        listings[assetId] = Listing(msg.sender, price, true);
    }

    // CANCEL LIST
    function cancelListing(uint256 assetId) external {
        Listing storage item = listings[assetId];

        require(item.active, "Not listed");
        require(item.seller == msg.sender, "Not seller");

        item.active = false;
    }

    // BUY
    function buyAsset(uint256 assetId) external nonReentrant {
        Listing storage item = listings[assetId];

        require(item.active, "Not for sale");
        require(balanceOf(msg.sender, GOLD) >= item.price, "Not enough GOLD");

        // mark inactive first
        item.active = false;

        // transfer GOLD
        _safeTransferFrom(msg.sender, item.seller, GOLD, item.price, "");

        // transfer asset first (important for consistency)
        _safeTransferFrom(item.seller, msg.sender, assetId, 1, "");

        // NOW update ownership safely AFTER transfer
        if (assetId >= 2000) {
            require(
                buildings[assetId].owner != address(0),
                "Building not found"
            );
            buildings[assetId].owner = msg.sender;
        } else if (assetId >= 1000) {
            require(lands[assetId].owner != address(0), "Land not found");
            lands[assetId].owner = msg.sender;
        }
    }

    // REQUIRED OVERRIDE
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
