import { useState, useEffect, useCallback } from "react";
import "./WorkerUI.css";
import socket from "./game/socket";
import gameState, { BUILDING_TYPES, LAND_PARCELS } from "./game/gameState";

const SKILL_LABELS = ["Blacksmithing", "Carpentry", "Magic Research"];
// Map tokenId (1-5) → parcel id string ("A1"..."A5")
const TOKEN_TO_PARCEL_ID = Object.fromEntries(LAND_PARCELS.map(p => [p.tokenId, p.id]));

export default function WorkerUI({ parcelId, parcelLabel, onClose }) {
  // parcelId = numeric tokenId (1-5)
  const [myStatus, setMyStatus] = useState("loading");
  // 'loading' | 'not-hired' | 'pending' | 'hired' | 'hired-elsewhere'

  const building      = gameState.placedBuildings[parcelId];
  const buildingType  = building?.buildingType ?? 0;
  const buildingLevel = building?.level ?? 1;
  const skillLabel    = SKILL_LABELS[buildingType] ?? "Unknown";

  const fetchStatus = useCallback(() => {
    setMyStatus("loading");
    socket.once("myWorkStatus", (res) => {
      if (res.hiredAtParcel === parcelId) {
        setMyStatus("hired");
      } else if (res.pendingAtParcel === parcelId) {
        setMyStatus("pending");
      } else if (res.hiredAtParcel !== null || res.pendingAtParcel !== null) {
        setMyStatus("hired-elsewhere");
      } else {
        setMyStatus("not-hired");
      }
    });
    socket.emit("getMyWorkStatus");
  }, [parcelId]);

  useEffect(() => {
    fetchStatus();

    const onFired = () => setMyStatus("not-hired");
    const onAccepted = ({ parcelId: pid }) => {
      if (pid === parcelId) setMyStatus("hired");
    };
    const onRejected = ({ parcelId: pid }) => {
      if (pid === parcelId) setMyStatus("not-hired");
    };

    socket.on("youAreFired",          onFired);
    socket.on("hireRequestAccepted",  onAccepted);
    socket.on("hireRequestRejected",  onRejected);
    return () => {
      socket.off("youAreFired",         onFired);
      socket.off("hireRequestAccepted", onAccepted);
      socket.off("hireRequestRejected", onRejected);
    };
  }, [fetchStatus, parcelId]);

  function handleApply() {
    const parcelKey  = TOKEN_TO_PARCEL_ID[parcelId] ?? "";
    const ownerWallet = gameState.landOwnership[parcelKey] ?? "";
    socket.emit("sendHireRequest", {
      parcelId,
      ownerWallet,
      requesterUsername: gameState.username,
      requesterWallet:   gameState.walletAddress,
    });
    setMyStatus("pending");
  }

  function handleCancelRequest() {
    socket.emit("cancelHireRequest", { parcelId });
    setMyStatus("not-hired");
  }

  function handleStartSession() {
    // Game.jsx handles closing WorkerUI and keeps the game locked during transition
    window.dispatchEvent(new CustomEvent("start-work-session", {
      detail: { parcelId, buildingType, buildingLevel },
    }));
  }

  function handleResign() {
    socket.emit("resignWorker", { parcelId });
    onClose();
  }

  return (
    <div className="worker-overlay">
      <div className="worker-panel">
        <h2 className="worker-title">Land {parcelLabel}</h2>

        {!building ? (
          <p className="worker-info">No building has been placed on this land yet.</p>
        ) : (
          <>
            <p className="worker-subtitle">
              {BUILDING_TYPES[buildingType]?.name} — Lv.{buildingLevel}
            </p>
            <p className="worker-info">
              Work here to train your <strong>{skillLabel}</strong> skill.<br />
              Each 15 s session earns <strong>1 gold × your skill level</strong> + <strong>5 exp</strong>.
            </p>

            {myStatus === "loading" && <p className="worker-status">Checking your status…</p>}

            {myStatus === "not-hired" && (
              <button className="worker-btn worker-btn-apply" onClick={handleApply}>
                Apply for Work
              </button>
            )}

            {myStatus === "pending" && (
              <>
                <p className="worker-status">Request sent — waiting for the owner to respond.</p>
                <button className="worker-btn worker-btn-secondary" onClick={handleCancelRequest}>
                  Withdraw Request
                </button>
              </>
            )}

            {myStatus === "hired" && (
              <>
                <p className="worker-hired">You are employed here!</p>
                <button className="worker-btn worker-btn-work" onClick={handleStartSession}>
                  Start Work Session (15 s)
                </button>
                <button className="worker-btn worker-btn-resign" onClick={handleResign}>
                  Resign
                </button>
              </>
            )}

            {myStatus === "hired-elsewhere" && (
              <p className="worker-status">
                You are already employed at another building.<br />
                Resign from that building first.
              </p>
            )}
          </>
        )}

        <button className="worker-btn worker-btn-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
