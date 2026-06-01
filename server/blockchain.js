import { ethers } from "ethers";

const GOLD_ABI = [
  "function recordWorkSession(address worker, uint256 workerAmount, address owner, uint256 ownerAmount) external",
];

let goldContract = null;

export function initBlockchain() {
  const privateKey  = process.env.PRIVATE_KEY;
  const rpcUrl      = process.env.SEPOLIA_URL;
  const goldAddress = process.env.GOLD_ADDRESS;

  if (!privateKey || !rpcUrl || !goldAddress || goldAddress === "UPDATE_AFTER_REDEPLOY") {
    console.warn("[Blockchain] GOLD_ADDRESS not set — on-chain work rewards disabled");
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const key      = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const wallet   = new ethers.Wallet(key, provider);
  goldContract   = new ethers.Contract(goldAddress, GOLD_ABI, wallet);
  console.log("[Blockchain] Gold contract ready at", goldAddress);
}

// Fire-and-forget — call after session timer fires; does not block game flow.
export async function mintWorkRewards(workerWallet, workerGold, ownerWallet, ownerGold) {
  if (!goldContract) return;
  if (!ethers.isAddress(workerWallet) || !ethers.isAddress(ownerWallet)) {
    console.warn("[Blockchain] Invalid wallet(s) — skipping on-chain reward:", { workerWallet, ownerWallet });
    return;
  }
  try {
    const tx = await goldContract.recordWorkSession(
      workerWallet,
      BigInt(workerGold),
      ownerWallet,
      BigInt(ownerGold)
    );
    await tx.wait();
    console.log(`[Blockchain] Work session minted — worker +${workerGold}G, owner +${ownerGold}G queued`);
  } catch (e) {
    console.error("[Blockchain] recordWorkSession failed:", e.message);
  }
}
