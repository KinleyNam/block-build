import { useState, useEffect, useCallback } from "react";
import "./BuildingManageUI.css";
import gameState, { BUILDING_TYPES, LAND_PARCELS } from "./game/gameState";
import socket from "./game/socket";
import {
  getMyBuildings,
  getAllPlacedBuildings,
  placeBuildingOnChain,
  removeBuildingOnChain,
  upgradeBuildingOnChain,
  downgradeBuildingOnChain,
  getGoldBalance,
  getPendingOwnerEarnings,
  claimOwnerEarnings,
  BUILDING_UPGRADE_COST,
} from "./game/contractService";
import { isConnected } from "./game/wallet";

function formatTimeAgo(ts) {
  if (!ts) return "Never";
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// UI placeholder images per type+level
import bg_blacksmith1   from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl1.png";
import bg_blacksmith2   from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl2.png";
import bg_blacksmith3   from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl3.png";
import bg_carpentry1    from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl1.png";
import bg_carpentry2    from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl2.png";
import bg_carpentry3    from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl3.png";
import bg_magic1        from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl1.png";
import bg_magic2        from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl2.png";
import bg_magic3        from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl3.png";

const PLACEHOLDERS = [
  [bg_blacksmith1, bg_blacksmith2, bg_blacksmith3],
  [bg_carpentry1,  bg_carpentry2,  bg_carpentry3],
  [bg_magic1,      bg_magic2,      bg_magic3],
];

function buildingImg(buildingType, level) {
  return PLACEHOLDERS[buildingType]?.[level - 1] ?? null;
}

export default function BuildingManageUI({ parcelId, parcelLabel, onClose }) {
  const [tab,          setTab]          = useState("building"); // "building" | "workers"
  const [myBuildings,  setMyBuildings]  = useState([]);
  const [placed,       setPlaced]       = useState(null); // { tokenId, buildingType, level } or null
  const [loading,      setLoading]      = useState(true);
  const [pending,      setPending]      = useState(false);
  const [error,        setError]        = useState("");

  // Workers tab state
  const [workerInfo,    setWorkerInfo]    = useState(null); // { worker, pendingRequests }
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError,   setWorkerError]   = useState("");

  // Earnings state
  const [pendingEarnings, setPendingEarnings] = useState(null); // number or null
  const [claimPending,    setClaimPending]    = useState(false);
  const [claimError,      setClaimError]      = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [buildings, placedMap, balance] = await Promise.all([
        getMyBuildings(gameState.walletAddress),
        getAllPlacedBuildings(),
        isConnected() ? getGoldBalance(gameState.walletAddress) : Promise.resolve(gameState.gold),
      ]);
      gameState.setMyBuildings(buildings);
      gameState.setPlacedBuildings(placedMap);
      gameState.gold = balance;
      gameState._emit();
      setMyBuildings(buildings);
      setPlaced(placedMap[parcelId] ?? null);
    } catch (e) {
      setError("Failed to load building data.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [parcelId]);

  useEffect(() => { refresh(); }, [refresh]);

  const fetchWorkerStatus = useCallback(() => {
    setWorkerLoading(true);
    setWorkerError("");
    socket.once("buildingWorkerStatus", (res) => {
      setWorkerInfo(res);
      setWorkerLoading(false);
    });
    socket.emit("getBuildingWorkerStatus", { parcelId });
  }, [parcelId]);

  useEffect(() => {
    if (tab !== "workers") return;
    fetchWorkerStatus();
    if (gameState.walletAddress) {
      getPendingOwnerEarnings(gameState.walletAddress)
        .then(setPendingEarnings)
        .catch(() => setPendingEarnings(null));
    }
  }, [tab, fetchWorkerStatus]);

  async function handleClaimEarnings() {
    setClaimPending(true);
    setClaimError("");
    try {
      await claimOwnerEarnings();
      const newBalance = await getGoldBalance(gameState.walletAddress);
      gameState.gold = newBalance;
      gameState._emit();
      setPendingEarnings(0);
    } catch (e) {
      setClaimError(e?.reason || e?.message || "Claim failed.");
    } finally {
      setClaimPending(false);
    }
  }

  function handleAccept(requesterUsername) {
    setWorkerError("");
    socket.once("respondHireRequestResult", (res) => {
      if (res?.error) { setWorkerError(res.error); return; }
      fetchWorkerStatus();
    });
    socket.emit("respondHireRequest", { parcelId, requesterUsername, accept: true });
  }

  function handleReject(requesterUsername) {
    setWorkerError("");
    socket.once("respondHireRequestResult", () => fetchWorkerStatus());
    socket.emit("respondHireRequest", { parcelId, requesterUsername, accept: false });
  }

  function handleFireWorker() {
    setWorkerError("");
    socket.once("fireWorkerResult", (res) => {
      if (res?.error) { setWorkerError(res.error); return; }
      fetchWorkerStatus();
    });
    socket.emit("fireWorker", { parcelId });
  }

  async function handlePlace(building) {
    setPending(true); setError("");
    try {
      await placeBuildingOnChain(building.tokenId, parcelId);
      await refresh();
    } catch (e) {
      setError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!placed) return;
    setPending(true); setError("");
    try {
      await removeBuildingOnChain(placed.tokenId);
      await refresh();
    } catch (e) {
      setError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleUpgrade() {
    if (!placed) return;
    setPending(true); setError("");
    try {
      await upgradeBuildingOnChain(placed.tokenId);
      await refresh();
    } catch (e) {
      setError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleDowngrade() {
    if (!placed) return;
    setPending(true); setError("");
    try {
      await downgradeBuildingOnChain(placed.tokenId);
      await refresh();
    } catch (e) {
      setError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setPending(false);
    }
  }

  const unplacedBuildings = myBuildings.filter(b => !b.placed);
  const parcel = LAND_PARCELS.find(p => p.tokenId === parcelId);

  return (
    <div className="bm-overlay">
      <div className="bm-panel">
        <h2 className="bm-title">Land {parcelLabel}</h2>

        {/* Tab switcher */}
        <div className="bm-tabs">
          <button
            className={`bm-tab${tab === "building" ? " bm-tab-active" : ""}`}
            onClick={() => setTab("building")}
          >Building</button>
          <button
            className={`bm-tab${tab === "workers" ? " bm-tab-active" : ""}`}
            onClick={() => setTab("workers")}
          >Workers</button>
        </div>

        {/* ── Workers tab ─────────────────────────────────────────────────── */}
        {tab === "workers" && (
          <>
            {/* Unclaimed earnings */}
            <div className="bm-earnings-card">
              <span className="bm-earnings-label">Unclaimed Earnings</span>
              <span className="bm-earnings-amount">
                {pendingEarnings === null ? "—" : `${pendingEarnings} GOLD`}
              </span>
              {claimError && <p className="bm-error" style={{ margin: "4px 0 0" }}>{claimError}</p>}
              <button
                className="bm-btn bm-btn-upgrade"
                style={{ marginTop: "8px" }}
                onClick={handleClaimEarnings}
                disabled={claimPending || !pendingEarnings}
              >
                {claimPending ? "Claiming…" : "Claim"}
              </button>
            </div>

            {workerLoading && <p className="bm-status">Loading…</p>}
            {workerError   && <p className="bm-error">{workerError}</p>}

            {!workerLoading && workerInfo && (
              <>
                <p className="bm-subtitle">Current Worker</p>
                {workerInfo.worker ? (
                  <div className="bm-worker-card">
                    <span className="bm-worker-name">{workerInfo.worker.workerUsername}</span>
                    <span className="bm-worker-meta">
                      Last worked: {formatTimeAgo(workerInfo.worker.lastWorked)}
                    </span>
                    <button className="bm-btn bm-btn-remove" onClick={handleFireWorker}>
                      Fire Worker
                    </button>
                  </div>
                ) : (
                  <p className="bm-status">No worker currently hired.</p>
                )}

                <p className="bm-subtitle" style={{ marginTop: "14px" }}>Pending Requests</p>
                {workerInfo.pendingRequests.length === 0 ? (
                  <p className="bm-status">No pending requests.</p>
                ) : (
                  <div className="bm-requests">
                    {workerInfo.pendingRequests.map(r => (
                      <div key={r.requesterUsername} className="bm-request-row">
                        <span className="bm-request-name">{r.requesterUsername}</span>
                        <div className="bm-request-btns">
                          <button
                            className="bm-btn bm-btn-upgrade"
                            style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                            onClick={() => handleAccept(r.requesterUsername)}
                            disabled={!!workerInfo.worker}
                          >Accept</button>
                          <button
                            className="bm-btn bm-btn-remove"
                            style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                            onClick={() => handleReject(r.requesterUsername)}
                          >Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="bm-btn bm-btn-cancel" style={{ marginTop: "10px" }} onClick={fetchWorkerStatus}>
                  Refresh
                </button>
              </>
            )}
          </>
        )}

        {/* ── Building tab ─────────────────────────────────────────────────── */}
        {tab === "building" && (
          <>
        {loading && <p className="bm-status">Loading…</p>}

        {!loading && placed && (
          <>
            <p className="bm-subtitle">Building on this land:</p>
            <div className="bm-placed-card">
              <img
                className="bm-placed-img"
                src={buildingImg(placed.buildingType, placed.level)}
                alt={BUILDING_TYPES[placed.buildingType]?.name}
              />
              <div className="bm-placed-info">
                <span className="bm-placed-name">{BUILDING_TYPES[placed.buildingType]?.name}</span>
                <span className="bm-placed-level">Level {placed.level} / 3</span>
              </div>
            </div>

            {error && <p className="bm-error">{error}</p>}

            {pending
              ? <p className="bm-status">Waiting for transaction…</p>
              : (
                <div className="bm-actions">
                  <button
                    className="bm-btn bm-btn-upgrade"
                    onClick={handleUpgrade}
                    disabled={placed.level >= 3}
                  >
                    Upgrade → Lv.{placed.level + 1} ({BUILDING_UPGRADE_COST}G)
                  </button>
                  <button
                    className="bm-btn bm-btn-downgrade"
                    onClick={handleDowngrade}
                    disabled={placed.level <= 1}
                  >
                    Downgrade → Lv.{placed.level - 1} ({BUILDING_UPGRADE_COST}G)
                  </button>
                  <button className="bm-btn bm-btn-remove" onClick={handleRemove}>
                    Remove from Land
                  </button>
                </div>
              )}
          </>
        )}

        {!loading && !placed && (
          <>
            {unplacedBuildings.length === 0
              ? <p className="bm-status">You have no buildings to place here.<br/>Buy one from the Marketplace.</p>
              : (
                <>
                  <p className="bm-subtitle">Select a building to place:</p>
                  {error && <p className="bm-error">{error}</p>}
                  {pending
                    ? <p className="bm-status">Waiting for transaction…</p>
                    : (
                      <div className="bm-grid">
                        {unplacedBuildings.map(b => (
                          <div key={b.tokenId} className="bm-card">
                            <img
                              className="bm-card-img"
                              src={buildingImg(b.buildingType, b.level)}
                              alt={BUILDING_TYPES[b.buildingType]?.name}
                            />
                            <span className="bm-card-name">{BUILDING_TYPES[b.buildingType]?.name}</span>
                            <span className="bm-card-level">Lv.{b.level}</span>
                            <button
                              className="bm-btn bm-btn-place"
                              onClick={() => handlePlace(b)}
                            >
                              Place Here
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </>
              )}
          </>
        )}

          </>
        )} {/* end building tab */}

        <button className="bm-btn bm-btn-cancel" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
