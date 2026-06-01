import { ethers } from "ethers";

const ABI = [
  "function refund(bytes32 id)",
  "function payout(bytes32 id, address winner)",
];

const rpcUrl     = (process.env.SEPOLIA_URL   ?? "").trim().replace(/^["']|["']$/g, "");
const rawKey     = (process.env.PRIVATE_KEY   ?? "").trim().replace(/^["']|["']$/g, "");
const privateKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;

console.log("[Escrow] RPC URL:", rpcUrl || "(empty — check server/.env SEPOLIA_URL)");
const provider   = new ethers.JsonRpcProvider(rpcUrl);
const signer     = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(process.env.ESCROW_ADDRESS, ABI, signer);

export async function refundEscrow(escrowId) {
  const tx = await contract.refund(escrowId);
  await tx.wait();
}

export async function payoutEscrow(escrowId, winnerAddress) {
  const tx = await contract.payout(escrowId, winnerAddress);
  await tx.wait();
}
