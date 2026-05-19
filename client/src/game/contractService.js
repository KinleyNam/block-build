import { Contract } from "ethers";
import { getSigner, getProvider } from "./wallet";
import { GOLD_ADDRESS, LAND_NFT_ADDRESS, GOLD_ABI, LAND_NFT_ABI } from "./contractConfig";

function goldContract(signerOrProvider) {
  return new Contract(GOLD_ADDRESS, GOLD_ABI, signerOrProvider);
}

function landContract(signerOrProvider) {
  return new Contract(LAND_NFT_ADDRESS, LAND_NFT_ABI, signerOrProvider);
}

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

// ── Primary land sale ─────────────────────────────────────────────────────────

// Returns array of 5 owner addresses (address(0) = unowned) for parcels A1–A5
export async function getAllLandOwners() {
  const land   = landContract(getProvider());
  const owners = await land.getAllOwners();
  return owners.map(addr => addr.toLowerCase());
}

// Approves Gold spend then buys the land NFT from the contract.
// tokenId: 1–5 (A1=1 … A5=5)
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
