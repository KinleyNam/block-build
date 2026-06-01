import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";
import User from "./models/User.js";
import BuildingWorker from "./models/BuildingWorker.js";
import HireRequest from "./models/HireRequest.js";
import { refundEscrow, payoutEscrow } from "./pvpEscrow.js";
import { initBlockchain, mintWorkRewards } from "./blockchain.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use("/users", userRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── MongoDB ───────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await loadWorkerData();
    startPositionAutoSave();
    initBlockchain();
  })
  .catch((err) => console.error("MongoDB error:", err));

// ── Socket.io multiplayer ─────────────────────────────────────────────────
const players     = {};
const pvpRequests = {}; // challengerId → { targetId, betAmount, challengerWallet, challengerUsername }
const pvpMatches  = {}; // matchId      → { p1, p2, betAmount, state, hitCooldowns }

// ── Worker / Hire System ──────────────────────────────────────────────────
// Keys use stable identifiers (parcelId, username) — NOT socket.id
const buildingWorkers     = {}; // parcelId (number) → { workerUsername, workerWallet, ownerWallet, lastWorked }
const pendingHireRequests = {}; // parcelId (number) → [{ requesterUsername, requesterWallet, ownerWallet }]
const activeSessions      = {}; // workerUsername    → { socketId, parcelId, buildingType, buildingLevel, timer }

const SKILL_NAMES = ["blacksmithing", "carpentry", "magicResearch"]; // index = buildingType

// ── Helpers ───────────────────────────────────────────────────────────────
function getSocketIdByUsername(username) {
  if (!username) return null;
  return Object.keys(players).find(sid => players[sid]?.username === username) ?? null;
}

function getSocketIdByWallet(wallet) {
  if (!wallet) return null;
  const lc = wallet.toLowerCase();
  return Object.keys(players).find(sid => players[sid]?.walletAddress?.toLowerCase() === lc) ?? null;
}

// ── Load persisted worker data from MongoDB on startup ────────────────────
async function loadWorkerData() {
  try {
    const workers  = await BuildingWorker.find({});
    const requests = await HireRequest.find({});

    workers.forEach(w => {
      buildingWorkers[w.parcelId] = {
        workerUsername: w.workerUsername,
        workerWallet:   w.workerWallet,
        ownerUsername:  w.ownerUsername,
        ownerWallet:    w.ownerWallet,
        lastWorked:     w.lastWorked ? w.lastWorked.getTime() : null,
      };
    });

    requests.forEach(r => {
      if (!pendingHireRequests[r.parcelId]) pendingHireRequests[r.parcelId] = [];
      pendingHireRequests[r.parcelId].push({
        requesterUsername: r.requesterUsername,
        requesterWallet:   r.requesterWallet,
        ownerWallet:       r.ownerWallet,
      });
    });

    console.log(`[Worker] Loaded ${workers.length} worker(s) and ${requests.length} pending request(s) from DB`);
  } catch (e) {
    console.error("[Worker] Failed to load worker data:", e.message);
  }
}

// ── Auto-save player positions to MongoDB every 60 seconds ───────────────
function startPositionAutoSave() {
  setInterval(async () => {
    const entries = Object.values(players).filter(p => p.username && p.scene);
    for (const player of entries) {
      try {
        await User.findOneAndUpdate(
          { username: player.username },
          { lastScene: player.scene, lastX: Math.round(player.x), lastY: Math.round(player.y) }
        );
      } catch { /* ignore per-player failures */ }
    }
    if (entries.length > 0) console.log(`[Position] Auto-saved positions for ${entries.length} player(s)`);
  }, 60000);
}

// ── Socket connections ────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.emit("currentPlayers", players);

  players[socket.id] = { id: socket.id, x: 400, y: 300, anim: "idle", flipX: true, scene: "StarterAreaScene", isWorking: false };

  socket.broadcast.emit("playerJoined", players[socket.id]);

  socket.on("playerMoved", (data) => {
    if (players[socket.id]) {
      players[socket.id].x             = data.x;
      players[socket.id].y             = data.y;
      players[socket.id].anim          = data.anim;
      players[socket.id].flipX         = data.flipX;
      players[socket.id].scene         = data.scene;
      if (data.username)      players[socket.id].username      = data.username;
      if (data.walletAddress) players[socket.id].walletAddress = data.walletAddress;
      // isWorking is server-authoritative — never overwritten from client
      socket.broadcast.emit("playerMoved", players[socket.id]);
    }
  });

  socket.on("joinScene", (sceneName) => {
    if (players[socket.id]) {
      players[socket.id].scene = sceneName;
      socket.broadcast.emit("playerMoved", players[socket.id]);
    }
  });

  socket.on("getPlayers", () => {
    socket.emit("currentPlayers", players);
  });

  socket.on("playerEmoji", (data) => {
    socket.broadcast.emit("playerEmoji", { id: socket.id, emoji: data.emoji, scene: data.scene });
  });

  // ── PvP ────────────────────────────────────────────────────────────────────

  socket.on("pvpRequest", (data) => {
    const { targetId, betAmount, escrowId, challengerWallet, challengerUsername } = data;

    // Block PvP against a player who is in a work session
    if (players[targetId]?.isWorking) {
      socket.emit("pvpTargetWorking");
      return;
    }

    // 10-second timeout — refund A and close B's panel if no response
    const timeout = setTimeout(() => {
      if (!pvpRequests[socket.id]) return;
      delete pvpRequests[socket.id];
      io.to(targetId).emit("pvpRequestExpired");
      socket.emit("pvpTimeout");
      if (escrowId && betAmount > 0) {
        refundEscrow(escrowId).catch(e => console.error("[PvP] refund failed:", e.message));
      }
    }, 10000);

    pvpRequests[socket.id] = { targetId, betAmount, escrowId, challengerWallet, challengerUsername, timeout };

    io.to(targetId).emit("pvpRequest", {
      challengerId: socket.id,
      challengerUsername,
      challengerWallet,
      betAmount,
      escrowId,
    });
  });

  socket.on("pvpAccepting", ({ challengerId }) => {
    const req = pvpRequests[challengerId];
    if (!req) return;
    clearTimeout(req.timeout);
    req.timeout = null;
  });

  socket.on("pvpDeclined", ({ challengerId }) => {
    console.log(`[PvP] pvpDeclined from ${socket.id}, challengerId=${challengerId}, requestExists=${!!pvpRequests[challengerId]}`);
    const req = pvpRequests[challengerId];
    io.to(challengerId).emit("pvpDeclined");
    if (!req) return;
    clearTimeout(req.timeout);
    delete pvpRequests[challengerId];
    if (req.escrowId && req.betAmount > 0) {
      refundEscrow(req.escrowId).catch(e => console.error("[PvP] refund failed:", e.message));
    }
  });

  socket.on("pvpAccepted", ({ challengerId, targetWallet, targetUsername }) => {
    console.log(`[PvP] pvpAccepted from ${socket.id}, challengerId=${challengerId}, requestExists=${!!pvpRequests[challengerId]}`);
    const request = pvpRequests[challengerId];
    if (!request) { console.log("[PvP] request not found — match may have timed out"); return; }
    clearTimeout(request.timeout);
    delete pvpRequests[challengerId];

    const matchId = `${challengerId}_${socket.id}`;
    pvpMatches[matchId] = {
      p1:           { id: challengerId, wallet: request.challengerWallet, username: request.challengerUsername, hp: 100 },
      p2:           { id: socket.id,   wallet: targetWallet,             username: targetUsername,             hp: 100 },
      betAmount:    request.betAmount,
      escrowId:     request.escrowId,
      state:        "fighting",
      hitCooldowns: {},
    };

    console.log(`[PvP] emitting pvpStart to p1=${challengerId} and p2=${socket.id}`);
    io.to(challengerId).emit("pvpStart", {
      matchId, role: "p1",
      opponent:  { id: socket.id,   wallet: targetWallet,             username: targetUsername },
      betAmount: request.betAmount,
    });
    io.to(socket.id).emit("pvpStart", {
      matchId, role: "p2",
      opponent:  { id: challengerId, wallet: request.challengerWallet, username: request.challengerUsername },
      betAmount: request.betAmount,
    });
  });

  socket.on("pvpArenaMove", ({ matchId, x, y, flipX, anim, isAttacking, isSliding, stamina }) => {
    const match = pvpMatches[matchId];
    if (!match) return;
    const opponentId = match.p1.id === socket.id ? match.p2.id : match.p1.id;
    io.to(opponentId).emit("pvpArenaMove", { x, y, flipX, anim, isAttacking, isSliding, stamina });
  });

  socket.on("pvpHit", ({ matchId }) => {
    const match = pvpMatches[matchId];
    if (!match || match.state !== "fighting") return;

    const isP1     = match.p1.id === socket.id;
    const target   = isP1 ? match.p2 : match.p1;
    const attacker = isP1 ? match.p1 : match.p2;

    if (match.hitCooldowns[socket.id]) return;
    match.hitCooldowns[socket.id] = true;
    setTimeout(() => { if (pvpMatches[matchId]) delete match.hitCooldowns[socket.id]; }, 600);

    target.hp = Math.max(0, target.hp - 25);

    io.to(match.p1.id).emit("pvpHpUpdate", { p1hp: match.p1.hp, p2hp: match.p2.hp });
    io.to(match.p2.id).emit("pvpHpUpdate", { p1hp: match.p1.hp, p2hp: match.p2.hp });

    if (target.hp <= 0) {
      match.state = "done";
      const result = {
        winner:       isP1 ? "p1" : "p2",
        winnerWallet: attacker.wallet,
        loserWallet:  target.wallet,
        betAmount:    match.betAmount,
      };
      io.to(match.p1.id).emit("pvpResult", result);
      io.to(match.p2.id).emit("pvpResult", result);
      if (attacker.username) {
        User.findOneAndUpdate({ username: attacker.username }, { $inc: { pvpWins: 1 } }).catch(() => {});
      }
      const { escrowId, betAmount } = match;
      console.log(`[PvP] match over — escrowId=${escrowId} betAmount=${betAmount} winner=${attacker.wallet}`);
      delete pvpMatches[matchId];
      if (escrowId && betAmount > 0) {
        payoutEscrow(escrowId, attacker.wallet)
          .then(() => {
            console.log(`[PvP] payout success — sent ${betAmount * 2} to ${attacker.wallet}`);
            io.to(attacker.id).emit("pvpPaid", { amount: betAmount * 2 });
          })
          .catch(e => console.error("[PvP] payout failed:", e.message, e.reason ?? ""));
      } else {
        console.log(`[PvP] no payout — escrowId=${escrowId} betAmount=${betAmount}`);
      }
    }
  });

  socket.on("pvpLeave", ({ matchId }) => {
    const match = pvpMatches[matchId];
    if (!match) return;
    delete pvpMatches[matchId];
    if (match.state === "done") return;
    const survivorId = match.p1.id === socket.id ? match.p2.id : match.p1.id;
    io.to(survivorId).emit("pvpAbort");
  });

  // ── Worker / Hire System ──────────────────────────────────────────────────
  // All worker lookups use username (stable across reconnects), not socket.id

  socket.on("getMyWorkStatus", () => {
    const myUsername = players[socket.id]?.username ?? null;
    let hiredAtParcel   = null;
    let pendingAtParcel = null;

    if (myUsername) {
      for (const [pid, worker] of Object.entries(buildingWorkers)) {
        if (worker.workerUsername === myUsername) { hiredAtParcel = Number(pid); break; }
      }
      for (const [pid, reqs] of Object.entries(pendingHireRequests)) {
        if (reqs.some(r => r.requesterUsername === myUsername)) { pendingAtParcel = Number(pid); break; }
      }
    }

    socket.emit("myWorkStatus", {
      hiredAtParcel,
      pendingAtParcel,
      isWorking: myUsername ? !!activeSessions[myUsername] : false,
    });
  });

  socket.on("getBuildingWorkerStatus", ({ parcelId }) => {
    const worker  = buildingWorkers[parcelId]     ?? null;
    const pending = pendingHireRequests[parcelId] ?? [];
    socket.emit("buildingWorkerStatus", {
      worker: worker ? {
        workerUsername: worker.workerUsername,
        lastWorked:     worker.lastWorked ?? null,
      } : null,
      pendingRequests: pending.map(r => ({
        requesterUsername: r.requesterUsername,
      })),
    });
  });

  socket.on("sendHireRequest", async ({ parcelId, ownerWallet, requesterUsername, requesterWallet }) => {
    const username = requesterUsername ?? players[socket.id]?.username;
    if (!username) return;
    if (buildingWorkers[parcelId]) return; // already has a worker
    if (!pendingHireRequests[parcelId]) pendingHireRequests[parcelId] = [];
    if (pendingHireRequests[parcelId].some(r => r.requesterUsername === username)) return; // duplicate

    const req = { requesterUsername: username, requesterWallet: requesterWallet ?? "", ownerWallet: ownerWallet ?? "" };
    pendingHireRequests[parcelId].push(req);

    try {
      await HireRequest.findOneAndUpdate(
        { parcelId, requesterUsername: username },
        { ...req, parcelId },
        { upsert: true, new: true }
      );
    } catch (e) { console.error("[Work] HireRequest save:", e.message); }

    let ownerSid = getSocketIdByWallet(ownerWallet);
    if (!ownerSid && ownerWallet) {
      // Owner may not have sent their wallet via playerMoved yet — look up by DB
      try {
        const ownerUser = await User.findOne({ walletAddress: new RegExp(`^${ownerWallet}$`, "i") });
        if (ownerUser) ownerSid = getSocketIdByUsername(ownerUser.username);
      } catch { /* ignore */ }
    }
    if (ownerSid) io.to(ownerSid).emit("newHireRequest", { parcelId, requesterUsername: username });
  });

  socket.on("cancelHireRequest", async ({ parcelId }) => {
    const username = players[socket.id]?.username;
    if (!username) return;
    if (pendingHireRequests[parcelId]) {
      pendingHireRequests[parcelId] = pendingHireRequests[parcelId].filter(r => r.requesterUsername !== username);
    }
    await HireRequest.deleteOne({ parcelId, requesterUsername: username }).catch(() => {});
  });

  socket.on("respondHireRequest", async ({ parcelId, requesterUsername, accept }) => {
    const reqs = pendingHireRequests[parcelId] ?? [];
    const idx  = reqs.findIndex(r => r.requesterUsername === requesterUsername);
    if (idx === -1) { socket.emit("respondHireRequestResult", { error: "Request not found." }); return; }

    const req = reqs[idx];

    if (accept) {
      if (buildingWorkers[parcelId]) {
        socket.emit("respondHireRequestResult", { error: "Building already has a worker." });
        return;
      }
      const workerData = {
        workerUsername: req.requesterUsername,
        workerWallet:   req.requesterWallet,
        ownerUsername:  players[socket.id]?.username ?? req.ownerUsername ?? "",
        ownerWallet:    players[socket.id]?.walletAddress ?? req.ownerWallet ?? "",
        lastWorked:     null,
      };
      buildingWorkers[parcelId] = workerData;

      try {
        await BuildingWorker.findOneAndUpdate(
          { parcelId },
          { ...workerData, parcelId },
          { upsert: true, new: true }
        );
        await HireRequest.deleteMany({ parcelId }); // clear all pending for this parcel
      } catch (e) { console.error("[Work] BuildingWorker save:", e.message); }

      // Reject all other pending requesters
      reqs.filter(r => r.requesterUsername !== requesterUsername).forEach(r => {
        const sid = getSocketIdByUsername(r.requesterUsername);
        if (sid) io.to(sid).emit("hireRequestRejected", { parcelId });
      });
      pendingHireRequests[parcelId] = [];

      const workerSid = getSocketIdByUsername(requesterUsername);
      if (workerSid) io.to(workerSid).emit("hireRequestAccepted", {
        parcelId,
        ownerUsername: players[socket.id]?.username ?? "Owner",
      });
    } else {
      reqs.splice(idx, 1);
      await HireRequest.deleteOne({ parcelId, requesterUsername }).catch(() => {});
      const workerSid = getSocketIdByUsername(requesterUsername);
      if (workerSid) io.to(workerSid).emit("hireRequestRejected", { parcelId });
    }

    socket.emit("respondHireRequestResult", { ok: true });
  });

  socket.on("startWorkSession", async ({ parcelId, buildingType, buildingLevel }) => {
    const myUsername = players[socket.id]?.username;
    console.log(`[Work] startWorkSession — parcel=${parcelId} user=${myUsername} worker=${buildingWorkers[parcelId]?.workerUsername}`);
    if (!myUsername) { socket.emit("workSessionError", "Not logged in."); return; }

    const worker = buildingWorkers[parcelId];
    if (!worker || worker.workerUsername !== myUsername) {
      socket.emit("workSessionError", "You are not hired at this building.");
      return;
    }
    if (activeSessions[myUsername]) {
      // Re-confirm for client reconnect or React StrictMode remount
      socket.emit("workSessionStarted", { ok: true });
      return;
    }

    if (players[socket.id]) players[socket.id].isWorking = true;
    socket.broadcast.emit("playerWorking", { id: socket.id, isWorking: true });
    socket.emit("workSessionStarted", { ok: true });

    const timer = setTimeout(async () => {
      delete activeSessions[myUsername];

      // Use current socket (worker may have reconnected)
      const currentSid = getSocketIdByUsername(myUsername);
      if (currentSid && players[currentSid]) players[currentSid].isWorking = false;
      io.emit("playerWorking", { id: currentSid ?? socket.id, isWorking: false });

      const workerInfo = buildingWorkers[parcelId];
      if (!workerInfo) return;

      const now = Date.now();
      workerInfo.lastWorked = now;
      await BuildingWorker.findOneAndUpdate({ parcelId }, { lastWorked: new Date(now) }).catch(() => {});

      const skillName = SKILL_NAMES[buildingType] ?? "carpentry";
      let skillLevel  = 1;
      try {
        const user = await User.findOne({ username: myUsername });
        skillLevel  = user?.skills?.[skillName]?.level ?? 1;
        await User.findOneAndUpdate(
          { username: myUsername },
          { $inc: { [`skills.${skillName}.exp`]: 5 } }
        );
      } catch (e) { console.error("[Work] DB error:", e.message); }

      const workerGold = 1 * skillLevel;
      const ownerGold  = (buildingLevel ?? 1) * 5;

      // Mint ERC-20 gold to worker; queue owner earnings on-chain (fire-and-forget)
      mintWorkRewards(
        workerInfo.workerWallet ?? "",
        workerGold,
        workerInfo.ownerWallet ?? "",
        ownerGold
      ).catch(e => console.error("[Blockchain] mintWorkRewards:", e.message));

      if (currentSid) {
        io.to(currentSid).emit("workSessionComplete", {
          parcelId, workerGold, ownerGold,
          skillType: skillName, expGain: 5, skillLevel,
        });
      }

      const ownerSid = getSocketIdByUsername(workerInfo.ownerUsername);
      if (ownerSid) {
        io.to(ownerSid).emit("workerSessionComplete", {
          parcelId, workerUsername: myUsername, ownerGold,
        });
      }
    }, 15000);

    activeSessions[myUsername] = { socketId: socket.id, parcelId, buildingType, buildingLevel, timer };
  });

  socket.on("cancelWorkSession", () => {
    const myUsername = players[socket.id]?.username;
    if (!myUsername) return;
    const session = activeSessions[myUsername];
    if (!session) return;
    clearTimeout(session.timer);
    delete activeSessions[myUsername];
    if (players[socket.id]) players[socket.id].isWorking = false;
    socket.broadcast.emit("playerWorking", { id: socket.id, isWorking: false });
    socket.emit("workSessionCancelled");
  });

  socket.on("fireWorker", async ({ parcelId }) => {
    const worker = buildingWorkers[parcelId];
    if (!worker) { socket.emit("fireWorkerResult", { error: "No worker to fire." }); return; }

    // Cancel any active session
    const session = activeSessions[worker.workerUsername];
    if (session) {
      clearTimeout(session.timer);
      delete activeSessions[worker.workerUsername];
      if (players[session.socketId]) players[session.socketId].isWorking = false;
      const workerSid = getSocketIdByUsername(worker.workerUsername);
      if (workerSid) {
        io.to(workerSid).emit("workSessionCancelled");
        io.emit("playerWorking", { id: workerSid, isWorking: false });
      }
    }

    const workerSid = getSocketIdByUsername(worker.workerUsername);
    if (workerSid) io.to(workerSid).emit("youAreFired", { parcelId });

    delete buildingWorkers[parcelId];
    await BuildingWorker.deleteOne({ parcelId }).catch(() => {});
    socket.emit("fireWorkerResult", { ok: true });
  });

  socket.on("resignWorker", async ({ parcelId }) => {
    const myUsername = players[socket.id]?.username;
    if (!myUsername) return;
    const worker = buildingWorkers[parcelId];
    if (!worker || worker.workerUsername !== myUsername) return;

    if (activeSessions[myUsername]) {
      clearTimeout(activeSessions[myUsername].timer);
      delete activeSessions[myUsername];
      if (players[socket.id]) players[socket.id].isWorking = false;
      socket.broadcast.emit("playerWorking", { id: socket.id, isWorking: false });
    }

    const ownerSid = getSocketIdByUsername(worker.ownerUsername);
    if (ownerSid) io.to(ownerSid).emit("workerResigned", { parcelId, workerUsername: myUsername });

    delete buildingWorkers[parcelId];
    await BuildingWorker.deleteOne({ parcelId }).catch(() => {});
  });

  // ── Disconnect ────────────────────────────────────────────────────────────

  socket.on("disconnect", async () => {
    console.log(`Player disconnected: ${socket.id}`);
    const username = players[socket.id]?.username; // capture before delete
    delete players[socket.id];
    io.emit("playerLeft", socket.id);

    // Cancel active work session (keep hire relationship — player keeps their job)
    if (username && activeSessions[username]) {
      clearTimeout(activeSessions[username].timer);
      delete activeSessions[username];
    }

    // Remove pending hire requests for this player
    if (username) {
      for (const [pid, reqs] of Object.entries(pendingHireRequests)) {
        const before = reqs.length;
        pendingHireRequests[pid] = reqs.filter(r => r.requesterUsername !== username);
        if (pendingHireRequests[pid].length === 0) delete pendingHireRequests[pid];
        if (pendingHireRequests[pid]?.length < before) {
          HireRequest.deleteOne({ parcelId: Number(pid), requesterUsername: username }).catch(() => {});
        }
      }
    }

    // Clean up any pending PvP requests
    delete pvpRequests[socket.id];
    for (const [cid, req] of Object.entries(pvpRequests)) {
      if (req.targetId === socket.id) delete pvpRequests[cid];
    }

    // Disconnected player loses — pay survivor from escrow
    for (const [matchId, match] of Object.entries(pvpMatches)) {
      if (match.p1.id === socket.id || match.p2.id === socket.id) {
        if (match.state === "fighting") {
          const survivorIsP1 = match.p2.id === socket.id;
          const survivor     = survivorIsP1 ? match.p1 : match.p2;
          io.to(survivor.id).emit("pvpResult", {
            winner:       survivorIsP1 ? "p1" : "p2",
            winnerWallet: survivor.wallet,
            betAmount:    match.betAmount,
            disconnected: true,
          });
          if (survivor.username) {
            User.findOneAndUpdate({ username: survivor.username }, { $inc: { pvpWins: 1 } }).catch(() => {});
          }
          if (match.escrowId && match.betAmount > 0) {
            payoutEscrow(match.escrowId, survivor.wallet)
              .then(() => io.to(survivor.id).emit("pvpPaid", { amount: match.betAmount * 2 }))
              .catch(e  => console.error("[PvP] disconnect payout failed:", e.message));
          }
        }
        delete pvpMatches[matchId];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
