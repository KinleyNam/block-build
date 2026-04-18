import { ethers } from "ethers";
import BlockBuildABI from "../contracts/artifacts/contracts/BlockBuild.sol/BlockBuild.json" assert { type: "json" };

// CONFIG — pull from environment variables
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;   // deployed contract
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY; // server wallet (owner)
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545"; // local hardhat or live RPC

// INIT — connect provider, signer, and contract instance
export async function initBlockchain() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    BlockBuildABI.abi,
    signer
  );

  const network = await provider.getNetwork();
  console.log(`[Blockchain] Connected to chain ${network.chainId} at ${RPC_URL}`);
  console.log(`[Blockchain] Contract: ${CONTRACT_ADDRESS}`);

  return { contract, provider, signer };
}
// READ — query on-chain state (used when a player connects / loads their data)
/**
 * Returns all land IDs and building IDs owned by a wallet address.
 * Since ERC1155 doesn't have enumeration, the server tracks minted IDs
 * and checks balances in batch.
 */
export async function getPlayerAssets(contract, walletAddress, mintedLandIds, mintedBuildingIds) {
  const allIds = [...mintedLandIds, ...mintedBuildingIds];
  const addresses = allIds.map(() => walletAddress);

  const balances = await contract.balanceOfBatch(addresses, allIds);

  const ownedLands = mintedLandIds.filter((_, i) => balances[i] > 0n);
  const ownedBuildings = mintedBuildingIds.filter((_, i) => balances[mintedLandIds.length + i] > 0n);

  return { ownedLands, ownedBuildings };
}

/**
 * Returns on-chain data for a specific building (landId, owner, level).
 */
export async function getBuildingInfo(contract, buildingId) {
  const building = await contract.buildings(buildingId);
  return {
    buildingId,
    landId: Number(building.landId),
    owner: building.owner,
    level: Number(building.level),
  };
}

/**
 * Returns the active listing for an asset, if any.
 */
export async function getListing(contract, assetId) {
  const listing = await contract.listings(assetId);
  if (!listing.active) return null;
  return {
    seller: listing.seller,
    price: ethers.formatUnits(listing.price, 0), // GOLD is integer
    active: listing.active,
  };
}
// WRITE — server-signed transactions (owner actions)
/**
 * Mints GOLD tokens to a player wallet. Called server-side when a player
 * earns gold through gameplay (quests, selling resources, etc).
 */
export async function mintGold(contract, toAddress, amount) {
  const tx = await contract.mintGold(toAddress, amount);
  await tx.wait();
  console.log(`[Blockchain] Minted ${amount} GOLD to ${toAddress} | tx: ${tx.hash}`);
  return tx.hash;
}

/**
 * Mints a new Land NFT to a player. Returns the new landId.
 */
export async function mintLand(contract, toAddress) {
  const tx = await contract.mintLand(toAddress);
  const receipt = await tx.wait();

  // Read the new ID from contract state (nextLandId was incremented)
  const newId = Number(await contract.nextLandId()) - 1;
  console.log(`[Blockchain] Minted Land #${newId} to ${toAddress} | tx: ${tx.hash}`);
  return { landId: newId, txHash: tx.hash };
}

/**
 * Mints a new Building NFT on a given land. Returns the new buildingId.
 */
export async function mintBuilding(contract, toAddress, landId) {
  const tx = await contract.mintBuilding(toAddress, landId);
  await tx.wait();

  const newId = Number(await contract.nextBuildingId()) - 1;
  console.log(`[Blockchain] Minted Building #${newId} on Land #${landId} | tx: ${tx.hash}`);
  return { buildingId: newId, txHash: tx.hash };
}

// EVENTS — listen for on-chain events and forward them to Socket.IO clients
/**
 * Registers ERC1155 TransferSingle listeners so that any on-chain transfer
 * (mint, buy, sell) is immediately broadcast to all connected game clients.
 * This keeps every player's UI in sync without polling.
 */
export function registerBlockchainEvents(io, contract) {

  // Fires on every ERC1155 single transfer: mints, buys, and sells all emit this
  contract.on("TransferSingle", (operator, from, to, id, value, event) => {
    const tokenId = Number(id);
    const isMint = from === ethers.ZeroAddress;

    const payload = {
      type: isMint ? "MINT" : "TRANSFER",
      tokenId,
      from,
      to,
      value: Number(value),
      txHash: event.log.transactionHash,
    };

    console.log(`[Blockchain] TransferSingle: token ${tokenId} from ${from} → ${to}`);

    // Notify all connected clients so they can refresh their inventory/map
    io.emit("chain:transfer", payload);

    // If it's a building transfer, also send updated building info
    if (tokenId >= 2000) {
      contract.buildings(id).then((b) => {
        io.emit("chain:buildingUpdate", {
          buildingId: tokenId,
          landId: Number(b.landId),
          owner: b.owner,
          level: Number(b.level),
        });
      });
    }
  });

  console.log("[Blockchain] Listening for on-chain events...");
}

// SOCKET HANDLERS — wire up in-game actions to blockchain calls
// Register this inside io.on("connection", (socket) => { ... }) in server.js
/**
 * Attaches all blockchain-related socket event handlers for a single client.
 *
 * Example in server.js:
 *   import { registerSocketHandlers } from "./refrence.js";
 *   io.on("connection", (socket) => {
 *     registerSocketHandlers(socket, io, contract);
 *   });
 */
export function registerSocketHandlers(socket, io, contract) {

  // Client requests their on-chain assets on login
  socket.on("player:getAssets", async ({ walletAddress, mintedLandIds, mintedBuildingIds }) => {
    try {
      const assets = await getPlayerAssets(contract, walletAddress, mintedLandIds, mintedBuildingIds);
      socket.emit("player:assets", assets);
    } catch (err) {
      socket.emit("error", { message: "Failed to load assets", detail: err.message });
    }
  });

  // Client requests to upgrade a building they own
  // Note: upgradeBuilding is called by the player's own wallet on the frontend.
  // The server just validates and acknowledges — do not call it here with the server key.
  socket.on("building:upgraded", async ({ buildingId }) => {
    try {
      const info = await getBuildingInfo(contract, buildingId);
      // Broadcast the new level to all clients viewing the same scene
      io.emit("chain:buildingUpdate", info);
    } catch (err) {
      socket.emit("error", { message: "Failed to fetch building info", detail: err.message });
    }
  });

  // Client completes a quest — server rewards GOLD on-chain
  socket.on("player:questComplete", async ({ walletAddress, questId, rewardAmount }) => {
    try {
      console.log(`[Quest] Player ${walletAddress} completed quest ${questId}, rewarding ${rewardAmount} GOLD`);
      const txHash = await mintGold(contract, walletAddress, rewardAmount);
      socket.emit("player:goldRewarded", { amount: rewardAmount, txHash });
    } catch (err) {
      socket.emit("error", { message: "Failed to reward GOLD", detail: err.message });
    }
  });

  // Client requests to claim a new land parcel
  socket.on("player:claimLand", async ({ walletAddress }) => {
    try {
      const { landId, txHash } = await mintLand(contract, walletAddress);
      socket.emit("player:landClaimed", { landId, txHash });
    } catch (err) {
      socket.emit("error", { message: "Failed to mint land", detail: err.message });
    }
  });

  // Client builds on a land parcel
  socket.on("player:buildOnLand", async ({ walletAddress, landId }) => {
    try {
      const { buildingId, txHash } = await mintBuilding(contract, walletAddress, landId);
      socket.emit("player:buildingCreated", { buildingId, landId, txHash });
      io.emit("chain:buildingUpdate", { buildingId, landId, owner: walletAddress, level: 1 });
    } catch (err) {
      socket.emit("error", { message: "Failed to mint building", detail: err.message });
    }
  });
}