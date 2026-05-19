// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LandNFT is ERC721, Ownable, ReentrancyGuard {
    IERC20 public immutable goldToken;

    uint256[5] private _prices = [100, 120, 140, 160, 180];

    // IPFS metadata URIs per tokenId — set after Pinata upload
    mapping(uint256 => string) private _tokenURIs;

    struct Listing {
        address seller;
        uint256 price;
        bool    active;
    }
    mapping(uint256 => Listing) public listings;

    event LandBought(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event LandListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event ListedLandSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);

    constructor(address _goldToken, address initialOwner)
        ERC721("BlockBuild Land", "BBLAND")
        Ownable(initialOwner)
    {
        goldToken = IERC20(_goldToken);
    }

    // ── Owner: set Pinata metadata URIs after deployment ─────────────────────

    function setTokenURI(uint256 tokenId, string calldata uri) external onlyOwner {
        require(tokenId >= 1 && tokenId <= 5, "Invalid parcel");
        _tokenURIs[tokenId] = uri;
    }

    function withdrawGold() external onlyOwner {
        goldToken.transfer(owner(), goldToken.balanceOf(address(this)));
    }

    // ── ERC-721 tokenURI ──────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    // ── Primary sale ──────────────────────────────────────────────────────────

    function landPrice(uint256 tokenId) external view returns (uint256) {
        require(tokenId >= 1 && tokenId <= 5, "Invalid parcel");
        return _prices[tokenId - 1];
    }

    function buyLand(uint256 tokenId) external nonReentrant {
        require(tokenId >= 1 && tokenId <= 5, "Invalid parcel");
        require(_ownerOf(tokenId) == address(0), "Land already owned");

        uint256 price = _prices[tokenId - 1];
        require(goldToken.transferFrom(msg.sender, address(this), price), "Gold transfer failed");

        _mint(msg.sender, tokenId);
        emit LandBought(tokenId, msg.sender, price);
    }

    // ── Player-to-player marketplace ──────────────────────────────────────────

    function listLand(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Price must be > 0");
        require(!listings[tokenId].active, "Already listed");

        listings[tokenId] = Listing(msg.sender, price, true);
        emit LandListed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
        Listing storage item = listings[tokenId];
        require(item.active, "Not listed");
        require(item.seller == msg.sender, "Not seller");

        item.active = false;
        emit ListingCancelled(tokenId);
    }

    function buyListedLand(uint256 tokenId) external nonReentrant {
        Listing storage item = listings[tokenId];
        require(item.active, "Not for sale");

        address seller = item.seller;
        uint256 price  = item.price;
        require(ownerOf(tokenId) == seller, "Seller no longer owns");

        // Deactivate before transfers to prevent reentrancy double-buy
        item.active = false;

        require(goldToken.transferFrom(msg.sender, seller, price), "Gold transfer failed");
        _transfer(seller, msg.sender, tokenId);

        emit ListedLandSold(tokenId, msg.sender, seller, price);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getAllOwners() external view returns (address[5] memory owners) {
        for (uint256 i = 1; i <= 5; i++) {
            owners[i - 1] = _ownerOf(i);
        }
    }

    function getListings() external view returns (
        uint256[] memory tokenIds,
        address[]  memory sellers,
        uint256[]  memory prices
    ) {
        uint256 count = 0;
        for (uint256 i = 1; i <= 5; i++) {
            if (listings[i].active) count++;
        }

        tokenIds = new uint256[](count);
        sellers  = new address[](count);
        prices   = new uint256[](count);

        uint256 idx = 0;
        for (uint256 i = 1; i <= 5; i++) {
            if (listings[i].active) {
                tokenIds[idx] = i;
                sellers[idx]  = listings[i].seller;
                prices[idx]   = listings[i].price;
                idx++;
            }
        }
    }

    // Auto-cancel listing when NFT is transferred externally (e.g. via MetaMask)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && listings[tokenId].active) {
            listings[tokenId].active = false;
            emit ListingCancelled(tokenId);
        }
        return from;
    }
}
