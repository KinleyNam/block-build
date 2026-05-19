
export const GOLD_ADDRESS     = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
export const LAND_NFT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

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
  "function faucet()",
  "function decimals() view returns (uint8)",
];

export const LAND_NFT_ABI = [
  // Primary sale
  "function buyLand(uint256 tokenId)",
  "function landPrice(uint256 tokenId) view returns (uint256)",
  "function getAllOwners() view returns (address[5])",
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
