// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILandNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract BuildingNFT is ERC721Enumerable, Ownable {
    IERC20   public immutable gold;
    ILandNFT public immutable landNFT;

    uint256 public constant BUY_PRICE    = 100;
    uint256 public constant UPGRADE_COST = 1;
    uint8   public constant MAX_LEVEL    = 3;

    uint256 private _nextTokenId = 1;

    // 0 = Blacksmith, 1 = Carpentry, 2 = MagicResearch
    struct BuildingData {
        uint8   buildingType;
        uint8   level;
        bool    placed;
        uint256 parcelId;   // 1–3, 0 if not placed
    }

    mapping(uint256 => BuildingData) public buildingData;
    mapping(uint256 => uint256)      public landBuilding; // parcelId => tokenId (0 = empty)

    struct Listing {
        address seller;
        uint256 price;
    }
    mapping(uint256 => Listing) public listings;

    event BuildingBought(uint256 indexed tokenId, address indexed buyer, uint8 buildingType);
    event BuildingUpgraded(uint256 indexed tokenId, uint8 newLevel);
    event BuildingDowngraded(uint256 indexed tokenId, uint8 newLevel);
    event BuildingPlaced(uint256 indexed tokenId, uint256 parcelId);
    event BuildingRemoved(uint256 indexed tokenId, uint256 parcelId);
    event BuildingListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event ListedBuildingSold(uint256 indexed tokenId, address indexed buyer, uint256 price);

    constructor(address _gold, address _landNFT)
        ERC721("BlockBuildBuilding", "BBB")
        Ownable(msg.sender)
    {
        gold    = IERC20(_gold);
        landNFT = ILandNFT(_landNFT);
    }

    // ── Primary sale ──────────────────────────────────────────────────────────

    function buyBuilding(uint8 buildingType) external {
        require(buildingType < 3, "Invalid type");
        gold.transferFrom(msg.sender, address(this), BUY_PRICE);
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        buildingData[tokenId] = BuildingData(buildingType, 1, false, 0);
        emit BuildingBought(tokenId, msg.sender, buildingType);
    }

    // ── Upgrade / Downgrade ───────────────────────────────────────────────────

    function upgradeBuilding(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(buildingData[tokenId].level < MAX_LEVEL, "Max level");
        gold.transferFrom(msg.sender, address(this), UPGRADE_COST);
        buildingData[tokenId].level++;
        emit BuildingUpgraded(tokenId, buildingData[tokenId].level);
    }

    function downgradeBuilding(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(buildingData[tokenId].level > 1, "Min level");
        gold.transferFrom(msg.sender, address(this), UPGRADE_COST);
        buildingData[tokenId].level--;
        emit BuildingDowngraded(tokenId, buildingData[tokenId].level);
    }

    // ── Place / Remove ────────────────────────────────────────────────────────

    function placeBuilding(uint256 tokenId, uint256 parcelId) external {
        require(ownerOf(tokenId) == msg.sender,           "Not building owner");
        require(!buildingData[tokenId].placed,            "Already placed");
        require(landBuilding[parcelId] == 0,              "Land occupied");
        require(listings[tokenId].seller == address(0),  "Delist first");
        require(landNFT.ownerOf(parcelId) == msg.sender, "Not land owner");
        buildingData[tokenId].placed   = true;
        buildingData[tokenId].parcelId = parcelId;
        landBuilding[parcelId]         = tokenId;
        emit BuildingPlaced(tokenId, parcelId);
    }

    function removeBuilding(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(buildingData[tokenId].placed,   "Not placed");
        uint256 parcelId = buildingData[tokenId].parcelId;
        buildingData[tokenId].placed   = false;
        buildingData[tokenId].parcelId = 0;
        landBuilding[parcelId]         = 0;
        emit BuildingRemoved(tokenId, parcelId);
    }

    // ── Marketplace ───────────────────────────────────────────────────────────

    function listBuilding(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender,          "Not owner");
        require(!buildingData[tokenId].placed,           "Remove from land first");
        require(listings[tokenId].seller == address(0), "Already listed");
        require(price > 0,                              "Price > 0");
        listings[tokenId] = Listing(msg.sender, price);
        emit BuildingListed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not seller");
        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    function buyListedBuilding(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        require(l.seller != address(0), "Not listed");
        require(l.seller != msg.sender, "Own listing");
        gold.transferFrom(msg.sender, l.seller, l.price);
        delete listings[tokenId];
        _transfer(l.seller, msg.sender, tokenId);
        emit ListedBuildingSold(tokenId, msg.sender, l.price);
    }

    // ── Read functions ────────────────────────────────────────────────────────

    // Returns placed building info for all 3 parcels (index 0 = parcel 1)
    function getAllPlacedBuildings() external view returns (
        uint256[3] memory tokenIds,
        uint8[3]   memory types,
        uint8[3]   memory levels
    ) {
        for (uint256 i = 1; i <= 3; i++) {
            uint256 tid = landBuilding[i];
            if (tid != 0) {
                tokenIds[i - 1] = tid;
                types[i - 1]    = buildingData[tid].buildingType;
                levels[i - 1]   = buildingData[tid].level;
            }
        }
    }

    // Returns all buildings owned by an address using ERC721Enumerable
    function getBuildingsByOwner(address owner_) external view returns (
        uint256[] memory tokenIds,
        uint8[]   memory types,
        uint8[]   memory levels,
        bool[]    memory placed,
        uint256[] memory parcelIds
    ) {
        uint256 count = balanceOf(owner_);
        tokenIds  = new uint256[](count);
        types     = new uint8[](count);
        levels    = new uint8[](count);
        placed    = new bool[](count);
        parcelIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 tid  = tokenOfOwnerByIndex(owner_, i);
            tokenIds[i]  = tid;
            types[i]     = buildingData[tid].buildingType;
            levels[i]    = buildingData[tid].level;
            placed[i]    = buildingData[tid].placed;
            parcelIds[i] = buildingData[tid].parcelId;
        }
    }

    // Returns all active P2P listings with building metadata
    function getAllListings() external view returns (
        uint256[] memory tokenIds,
        address[] memory sellers,
        uint256[] memory prices,
        uint8[]   memory types,
        uint8[]   memory levels
    ) {
        uint256 total = _nextTokenId - 1;
        uint256 count = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (listings[i].seller != address(0)) count++;
        }
        tokenIds = new uint256[](count);
        sellers  = new address[](count);
        prices   = new uint256[](count);
        types    = new uint8[](count);
        levels   = new uint8[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (listings[i].seller != address(0)) {
                tokenIds[idx] = i;
                sellers[idx]  = listings[i].seller;
                prices[idx]   = listings[i].price;
                types[idx]    = buildingData[i].buildingType;
                levels[idx]   = buildingData[i].level;
                idx++;
            }
        }
    }

    function withdraw() external onlyOwner {
        gold.transfer(owner(), gold.balanceOf(address(this)));
    }
}
