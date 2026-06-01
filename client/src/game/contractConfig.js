
export const GOLD_ADDRESS     = "0x3eb7287D441620E90261CD8905d6153801BAb912";
export const LAND_NFT_ADDRESS = "0x48F02B81202d0462d0d4DA9C4108d3CBe08E4018";
export const ESCROW_ADDRESS   = "0xf82f1FAf9fB8e1fe892B7fB93139D70ef34f78d5";

export const PINATA_GATEWAY = "https://plum-blank-crow-445.mypinata.cloud";

// Converts ipfs://Qm... → https://gateway/ipfs/Qm...
export function ipfsToUrl(uri) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return `${PINATA_GATEWAY}/ipfs/${uri.slice(7)}`;
  return uri;
}

// The land image CID — same for all 5 parcels
export const LAND_IMAGE_URL = `${PINATA_GATEWAY}/ipfs/QmXDKwArigLtyesRYBkTpEQ63eYhNg77Lfd2PrGvyjrKNm`;

export const GOLD_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function faucet()",
  "function decimals() view returns (uint8)",
  "function pendingOwnerEarnings(address owner) view returns (uint256)",
  "function claimOwnerEarnings()",
];

export const LAND_NFT_ABI = [
  // Primary sale
  "function buyLand(uint256 tokenId)",
  "function landPrice(uint256 tokenId) view returns (uint256)",
  "function getAllOwners() view returns (address[3])",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",

  // Marketplace
  "function listLand(uint256 tokenId, uint256 price)",
  "function cancelListing(uint256 tokenId)",
  "function buyListedLand(uint256 tokenId)",
  "function getListings() view returns (uint256[] tokenIds, address[] sellers, uint256[] prices)",
  "function listings(uint256) view returns (address seller, uint256 price, bool active)",

  // Events
  "event LandBought(uint256 indexed tokenId, address indexed buyer, uint256 price)",
  "event LandListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event ListingCancelled(uint256 indexed tokenId)",
  "event ListedLandSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price)",
];

export const ESCROW_ABI = [
  "function deposit(bytes32 id, uint256 amount)",
  "function join(bytes32 id)",
];

// ── Building NFT ─────────────────────────────────────────────────────────────
// TODO: replace with deployed address after running: npx hardhat ignition deploy
export const BUILDING_NFT_ADDRESS = "0x58fB02d9a2fd3Aa1C8DdC094C201075B4a0b1875";

export const BUILDING_NFT_ABI = [
  // Primary sale
  "function buyBuilding(uint8 buildingType)",
  "function BUY_PRICE() view returns (uint256)",
  "function UPGRADE_COST() view returns (uint256)",

  // Upgrade / Downgrade
  "function upgradeBuilding(uint256 tokenId)",
  "function downgradeBuilding(uint256 tokenId)",

  // Place / Remove
  "function placeBuilding(uint256 tokenId, uint256 parcelId)",
  "function removeBuilding(uint256 tokenId)",

  // Marketplace
  "function listBuilding(uint256 tokenId, uint256 price)",
  "function cancelListing(uint256 tokenId)",
  "function buyListedBuilding(uint256 tokenId)",

  // Read
  "function getAllPlacedBuildings() view returns (uint256[3] tokenIds, uint8[3] types, uint8[3] levels)",
  "function getBuildingsByOwner(address owner) view returns (uint256[] tokenIds, uint8[] types, uint8[] levels, bool[] placed, uint256[] parcelIds)",
  "function getAllListings() view returns (uint256[] tokenIds, address[] sellers, uint256[] prices, uint8[] types, uint8[] levels)",
  "function buildingData(uint256 tokenId) view returns (uint8 buildingType, uint8 level, bool placed, uint256 parcelId)",

  // Events
  "event BuildingBought(uint256 indexed tokenId, address indexed buyer, uint8 buildingType)",
  "event BuildingUpgraded(uint256 indexed tokenId, uint8 newLevel)",
  "event BuildingDowngraded(uint256 indexed tokenId, uint8 newLevel)",
  "event BuildingPlaced(uint256 indexed tokenId, uint256 parcelId)",
  "event BuildingRemoved(uint256 indexed tokenId, uint256 parcelId)",
  "event BuildingListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event ListingCancelled(uint256 indexed tokenId)",
  "event ListedBuildingSold(uint256 indexed tokenId, address indexed buyer, uint256 price)",
];
