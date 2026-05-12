// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BlockBuild is ERC1155, ERC1155Supply, Ownable, ReentrancyGuard {

    // ── Token IDs ─────────────────────────────────────────────────────────────
    uint256 public constant GOLD = 1;

    // Fixed land parcel IDs matching the CommercialDistrict game world
    uint256 public constant PARCEL_A1 = 1000;
    uint256 public constant PARCEL_A2 = 1001;
    uint256 public constant PARCEL_A3 = 1002;
    uint256 public constant PARCEL_A4 = 1003;
    uint256 public constant PARCEL_A5 = 1004;

    // Auto-incrementing IDs start after the fixed parcels
    uint256 public nextLandId     = 1005;
    uint256 public nextBuildingId = 3000;

    // ── Storage ───────────────────────────────────────────────────────────────
    struct Land {
        uint256 landId;
        address owner;
    }

    struct Building {
        uint256 landId;
        uint8   level;
    }

    struct Listing {
        address seller;
        uint256 price;
        bool    active;
    }

    mapping(uint256 => Land)     public lands;
    mapping(uint256 => Building) public buildings;
    mapping(uint256 => Listing)  public listings;
    mapping(uint256 => uint256)  public parcelPrices;

    // ── Events ────────────────────────────────────────────────────────────────
    event LandClaimed(uint256 indexed parcelId, address indexed buyer, uint256 price);
    event LandMinted(uint256 indexed landId, address indexed to);
    event BuildingMinted(uint256 indexed buildingId, uint256 indexed landId, address indexed owner);
    event BuildingUpgraded(uint256 indexed buildingId, uint8 newLevel);
    event AssetListed(uint256 indexed assetId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed assetId);
    event AssetSold(uint256 indexed assetId, address indexed buyer, address indexed seller, uint256 price);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address initialOwner)
        ERC1155("ipfs://metadata/{id}.json")
        Ownable(initialOwner)
    {
        parcelPrices[PARCEL_A1] = 100;
        parcelPrices[PARCEL_A2] = 120;
        parcelPrices[PARCEL_A3] = 140;
        parcelPrices[PARCEL_A4] = 160;
        parcelPrices[PARCEL_A5] = 180;
    }

    // ── GOLD ──────────────────────────────────────────────────────────────────

    /// Called by the backend when a new player registers (gives starter gold).
    function mintGold(address to, uint256 amount) external onlyOwner {
        _mint(to, GOLD, amount, "");
    }

    // ── LAND ──────────────────────────────────────────────────────────────────

    /// Player buys a fixed parcel (A1–A5) by burning GOLD at the on-chain price.
    function claimLand(uint256 parcelId) external nonReentrant {
        require(parcelPrices[parcelId] > 0, "Invalid parcel");
        require(lands[parcelId].landId == 0, "Already claimed");

        uint256 price = parcelPrices[parcelId];
        require(balanceOf(msg.sender, GOLD) >= price, "Not enough GOLD");

        _burn(msg.sender, GOLD, price);
        _mint(msg.sender, parcelId, 1, "");
        lands[parcelId] = Land(parcelId, msg.sender);

        emit LandClaimed(parcelId, msg.sender, price);
    }

    /// Owner mints custom land for future expansion beyond A1–A5.
    function mintLand(address to) external onlyOwner returns (uint256) {
        uint256 id = nextLandId++;
        _mint(to, id, 1, "");
        lands[id] = Land(id, to);
        emit LandMinted(id, to);
        return id;
    }

    /// Returns true if a parcel exists and has not been claimed yet.
    function isParcelAvailable(uint256 parcelId) external view returns (bool) {
        return parcelPrices[parcelId] > 0 && lands[parcelId].landId == 0;
    }

    // ── BUILDING ──────────────────────────────────────────────────────────────

    function mintBuilding(address to, uint256 landId) external onlyOwner returns (uint256) {
        require(lands[landId].landId != 0, "Land does not exist");
        require(balanceOf(to, landId) > 0, "Not land owner");

        uint256 id = nextBuildingId++;
        _mint(to, id, 1, "");
        buildings[id] = Building(landId, 1);

        emit BuildingMinted(id, landId, to);
        return id;
    }

    function upgradeBuilding(uint256 id) external {
        Building storage b = buildings[id];
        require(balanceOf(msg.sender, id) > 0, "Not owner");
        require(b.level < 3, "Max level reached");

        b.level++;
        emit BuildingUpgraded(id, b.level);
    }

    // ── MARKETPLACE ───────────────────────────────────────────────────────────

    function listAsset(uint256 assetId, uint256 price) external {
        require(balanceOf(msg.sender, assetId) > 0, "Not owner");
        require(price > 0, "Price must be > 0");
        require(!listings[assetId].active, "Already listed");

        listings[assetId] = Listing(msg.sender, price, true);
        emit AssetListed(assetId, msg.sender, price);
    }

    function cancelListing(uint256 assetId) external {
        Listing storage item = listings[assetId];
        require(item.active, "Not listed");
        require(item.seller == msg.sender, "Not seller");

        item.active = false;
        emit ListingCancelled(assetId);
    }

    function buyAsset(uint256 assetId) external nonReentrant {
        Listing storage item = listings[assetId];
        require(item.active, "Not for sale");
        require(balanceOf(msg.sender, GOLD) >= item.price, "Not enough GOLD");

        address seller = item.seller;
        uint256 price  = item.price;
        item.active    = false;

        _safeTransferFrom(msg.sender, seller, GOLD, price, "");
        _safeTransferFrom(seller, msg.sender, assetId, 1, "");

        emit AssetSold(assetId, msg.sender, seller, price);
    }

    // ── REQUIRED OVERRIDE ─────────────────────────────────────────────────────

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            if (lands[id].landId != 0 && values[i] == 1 && to != address(0)) {
                lands[id].owner = to;
            }
        }
    }
}
