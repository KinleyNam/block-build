import { Contract, keccak256, toUtf8Bytes } from "ethers";
import { getSigner, getProvider } from "./wallet";
import {
  GOLD_ADDRESS, LAND_NFT_ADDRESS, GOLD_ABI, LAND_NFT_ABI,
  ESCROW_ADDRESS, ESCROW_ABI,
  BUILDING_NFT_ADDRESS, BUILDING_NFT_ABI,
} from "./contractConfig";

function goldContract(signerOrProvider) {
  return new Contract(GOLD_ADDRESS, GOLD_ABI, signerOrProvider);
}

function landContract(signerOrProvider) {
  return new Contract(LAND_NFT_ADDRESS, LAND_NFT_ABI, signerOrProvider);
}

function escrowContract(signerOrProvider) {
  return new Contract(ESCROW_ADDRESS, ESCROW_ABI, signerOrProvider);
}

function buildingContract(signerOrProvider) {
  return new Contract(BUILDING_NFT_ADDRESS, BUILDING_NFT_ABI, signerOrProvider);
}

export const BUILDING_BUY_PRICE  = 100;
export const BUILDING_UPGRADE_COST = 1;

// ── Gold ──────────────────────────────────────────────────────────────────────

export async function getGoldBalance(address) {
  const gold = goldContract(getProvider());
  const bal  = await gold.balanceOf(address);
  return Number(bal);
}

export async function claimFaucet() {
  const gold = goldContract(getSigner());
  const tx   = await gold.faucet();
  await tx.wait();
}

// Returns unclaimed building earnings for a wallet address
export async function getPendingOwnerEarnings(address) {
  const gold = goldContract(getProvider());
  const amt  = await gold.pendingOwnerEarnings(address);
  return Number(amt);
}

// Owner claims all accumulated building earnings from the contract
export async function claimOwnerEarnings() {
  const gold = goldContract(getSigner());
  const tx   = await gold.claimOwnerEarnings();
  await tx.wait();
}

// ── Primary land sale ─────────────────────────────────────────────────────────

// Returns array of 3 owner addresses (address(0) = unowned) for parcels A1–A3
export async function getAllLandOwners() {
  const land   = landContract(getProvider());
  const owners = await land.getAllOwners();
  return owners.map(addr => addr.toLowerCase());
}

// Approves Gold spend then buys the land NFT from the contract.
// tokenId: 1–3 (A1=1 … A3=3)
export async function buyLandOnChain(tokenId) {
  const signer = getSigner();
  const gold   = goldContract(signer);
  const land   = landContract(signer);

  const price      = await land.landPrice(tokenId);
  const approveTx  = await gold.approve(LAND_NFT_ADDRESS, price);
  await approveTx.wait();

  const buyTx = await land.buyLand(tokenId);
  await buyTx.wait();
}

// ── PvP escrow ────────────────────────────────────────────────────────────────

// Challenger: approve escrow then deposit bet. Returns the escrowId used.
export async function depositToEscrow(amount) {
  const signer  = getSigner();
  const gold    = goldContract(signer);
  const escrow  = escrowContract(signer);
  const address = await signer.getAddress();

  const escrowId = keccak256(toUtf8Bytes(`${address}_${Date.now()}_${Math.random()}`));

  const approveTx = await gold.approve(ESCROW_ADDRESS, amount);
  await approveTx.wait();

  const depositTx = await escrow.deposit(escrowId, amount);
  await depositTx.wait();

  return escrowId;
}

// Acceptor: approve escrow then join with the same escrowId.
export async function joinEscrow(escrowId, amount) {
  const signer = getSigner();
  const gold   = goldContract(signer);
  const escrow = escrowContract(signer);

  const approveTx = await gold.approve(ESCROW_ADDRESS, amount);
  await approveTx.wait();

  const joinTx = await escrow.join(escrowId);
  await joinTx.wait();
}

// ── Player-to-player marketplace ──────────────────────────────────────────────

// List an owned parcel for sale at `price` GOLD
export async function listLandOnChain(tokenId, price) {
  const land = landContract(getSigner());
  const tx   = await land.listLand(tokenId, price);
  await tx.wait();
}

// Cancel an active listing (must be the seller)
export async function cancelListingOnChain(tokenId) {
  const land = landContract(getSigner());
  const tx   = await land.cancelListing(tokenId);
  await tx.wait();
}

// Approves Gold spend then buys a listed parcel from another player
export async function buyListedLandOnChain(tokenId, price) {
  const signer = getSigner();
  const gold   = goldContract(signer);
  const land   = landContract(signer);

  const approveTx = await gold.approve(LAND_NFT_ADDRESS, price);
  await approveTx.wait();

  const buyTx = await land.buyListedLand(tokenId);
  await buyTx.wait();
}

// Returns all active marketplace listings
export async function getListings() {
  const land = landContract(getProvider());
  const [tokenIds, sellers, prices] = await land.getListings();
  return tokenIds.map((id, i) => ({
    tokenId: Number(id),
    seller:  sellers[i].toLowerCase(),
    price:   Number(prices[i]),
  }));
}

// ── Building NFT ──────────────────────────────────────────────────────────────

// Returns all buildings owned by an address
export async function getMyBuildings(address) {
  const bldg = buildingContract(getProvider());
  const [tokenIds, types, levels, placed, parcelIds] = await bldg.getBuildingsByOwner(address);
  return tokenIds.map((id, i) => ({
    tokenId:      Number(id),
    buildingType: Number(types[i]),
    level:        Number(levels[i]),
    placed:       placed[i],
    parcelId:     Number(parcelIds[i]),
  }));
}

// Returns map of parcelId (1–5) → { tokenId, buildingType, level } for placed buildings
export async function getAllPlacedBuildings() {
  const bldg = buildingContract(getProvider());
  const [tokenIds, types, levels] = await bldg.getAllPlacedBuildings();
  const result = {};
  for (let i = 0; i < 3; i++) {
    const tid = Number(tokenIds[i]);
    if (tid !== 0) {
      result[i + 1] = {
        tokenId:      tid,
        buildingType: Number(types[i]),
        level:        Number(levels[i]),
      };
    }
  }
  return result;
}

// Approve gold + buy a level-1 building NFT (buildingType: 0=Blacksmith, 1=Carpentry, 2=MagicResearch)
export async function buyBuildingOnChain(buildingType) {
  const signer = getSigner();
  const gold   = goldContract(signer);
  const bldg   = buildingContract(signer);
  const approveTx = await gold.approve(BUILDING_NFT_ADDRESS, BUILDING_BUY_PRICE);
  await approveTx.wait();
  const buyTx = await bldg.buyBuilding(buildingType);
  await buyTx.wait();
}

// Approve 1 gold + upgrade building level (max 3)
export async function upgradeBuildingOnChain(tokenId) {
  const signer = getSigner();
  const gold   = goldContract(signer);
  const bldg   = buildingContract(signer);
  const approveTx = await gold.approve(BUILDING_NFT_ADDRESS, BUILDING_UPGRADE_COST);
  await approveTx.wait();
  const tx = await bldg.upgradeBuilding(tokenId);
  await tx.wait();
}

// Approve 1 gold + downgrade building level (min 1)
export async function downgradeBuildingOnChain(tokenId) {
  const signer = getSigner();
  const gold   = goldContract(signer);
  const bldg   = buildingContract(signer);
  const approveTx = await gold.approve(BUILDING_NFT_ADDRESS, BUILDING_UPGRADE_COST);
  await approveTx.wait();
  const tx = await bldg.downgradeBuilding(tokenId);
  await tx.wait();
}

// Place an unplaced building onto a land parcel (must own both)
export async function placeBuildingOnChain(tokenId, parcelId) {
  const bldg = buildingContract(getSigner());
  const tx   = await bldg.placeBuilding(tokenId, parcelId);
  await tx.wait();
}

// Remove a placed building back to inventory
export async function removeBuildingOnChain(tokenId) {
  const bldg = buildingContract(getSigner());
  const tx   = await bldg.removeBuilding(tokenId);
  await tx.wait();
}

// List an unplaced building for P2P sale
export async function listBuildingOnChain(tokenId, price) {
  const bldg = buildingContract(getSigner());
  const tx   = await bldg.listBuilding(tokenId, price);
  await tx.wait();
}

// Cancel an active building listing
export async function cancelBuildingListingOnChain(tokenId) {
  const bldg = buildingContract(getSigner());
  const tx   = await bldg.cancelListing(tokenId);
  await tx.wait();
}

// Approve gold + buy a listed building from another player
export async function buyListedBuildingOnChain(tokenId, price) {
  const signer = getSigner();
  const gold   = goldContract(signer);
  const bldg   = buildingContract(signer);
  const approveTx = await gold.approve(BUILDING_NFT_ADDRESS, price);
  await approveTx.wait();
  const buyTx = await bldg.buyListedBuilding(tokenId);
  await buyTx.wait();
}

// Returns all active building marketplace listings
export async function getBuildingListings() {
  const bldg = buildingContract(getProvider());
  const [tokenIds, sellers, prices, types, levels] = await bldg.getAllListings();
  return tokenIds.map((id, i) => ({
    tokenId:      Number(id),
    seller:       sellers[i].toLowerCase(),
    price:        Number(prices[i]),
    buildingType: Number(types[i]),
    level:        Number(levels[i]),
  }));
}
