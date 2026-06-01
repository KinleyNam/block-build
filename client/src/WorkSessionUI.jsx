import { useState, useEffect, useRef } from "react";
import "./WorkSessionUI.css";
import socket from "./game/socket";
import { BUILDING_TYPES } from "./game/gameState";

const DURATION = 15; // seconds

// Survives React StrictMode cleanup/remount cycle (module-level, not per-instance)
let _cancelTimer = null;

// ── Main work session countdown overlay ───────────────────────────────────
export default function WorkSessionUI({ parcelId, buildingType, buildingLevel, onComplete, onCancel }) {
  const [timeLeft, setTimeLeft]   = useState(DURATION);
  const [started,  setStarted]    = useState(false);
  const [errMsg,   setErrMsg]     = useState("");
  const intervalRef  = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    // If a cancel timer is pending, this is a StrictMode remount — clear it.
    // The session is already started on the server; don't re-emit startWorkSession.
    const isStrictRemount = _cancelTimer !== null;
    if (_cancelTimer) { clearTimeout(_cancelTimer); _cancelTimer = null; }

    const startTimer = () => {
      setStarted(true);
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = parseFloat((prev - 0.1).toFixed(1));
          return next <= 0 ? 0 : next;
        });
      }, 100);
    };

    const handleStarted  = () => startTimer();
    const handleError    = (msg) => { setErrMsg(msg); setTimeout(onCancel, 2000); };
    const handleComplete = (data) => {
      if (completedRef.current) return;
      completedRef.current = true;
      clearInterval(intervalRef.current);
      onComplete(data);
    };
    const handleCancelled = () => { clearInterval(intervalRef.current); onCancel(); };
    const handleFired     = () => { clearInterval(intervalRef.current); onCancel(); };

    socket.once("workSessionStarted",  handleStarted);
    socket.once("workSessionError",    handleError);
    socket.on("workSessionComplete",   handleComplete);
    socket.on("workSessionCancelled",  handleCancelled);
    socket.on("youAreFired",           handleFired);

    // Only emit on first (real) mount — StrictMode remount skips this since
    // the server re-confirms the existing session when it receives startWorkSession again.
    if (!isStrictRemount) {
      socket.emit("startWorkSession", { parcelId, buildingType, buildingLevel });
    }

    return () => {
      clearInterval(intervalRef.current);
      socket.off("workSessionStarted",  handleStarted);
      socket.off("workSessionError",    handleError);
      socket.off("workSessionComplete",  handleComplete);
      socket.off("workSessionCancelled", handleCancelled);
      socket.off("youAreFired",          handleFired);
      // Defer cancel so StrictMode remount can intercept it
      if (!completedRef.current) {
        _cancelTimer = setTimeout(() => {
          _cancelTimer = null;
          socket.emit("cancelWorkSession");
        }, 100);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCancelClick() {
    socket.emit("cancelWorkSession");
    // Server emits workSessionCancelled → handleCancelled → onCancel()
  }

  const progress   = 1 - timeLeft / DURATION;
  const typeName   = BUILDING_TYPES[buildingType]?.name ?? "Building";

  if (errMsg) {
    return (
      <div className="ws-overlay">
        <div className="ws-panel">
          <p className="ws-error">{errMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-overlay">
      <div className="ws-panel">
        <h2 className="ws-title">Working at {typeName}</h2>

        {started ? (
          <>
            <div className="ws-timer">{timeLeft.toFixed(1)}s</div>
            <div className="ws-bar-bg">
              <div className="ws-bar-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="ws-hint">Stay until the timer ends to earn your reward!</p>
            <button className="ws-cancel-btn" onClick={handleCancelClick}>
              Cancel (forfeit reward)
            </button>
          </>
        ) : (
          <p className="ws-hint">Starting session…</p>
        )}
      </div>
    </div>
  );
}

// ── Toast: worker earns gold on session complete ───────────────────────────
export function WorkCompleteToast({ data, onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const skillLabel = { blacksmithing: "Blacksmithing", carpentry: "Carpentry", magicResearch: "Magic Research" }[data.skillType] ?? data.skillType;

  return (
    <div className={`work-toast${fading ? " work-toast-fade-out" : ""}`}>
      <span className="work-toast-icon">⚒</span>
      <span>Work complete!&nbsp;<strong className="work-toast-gold">+{data.workerGold}G</strong></span>
      <span className="work-toast-exp">+{data.expGain} {skillLabel} exp (Lv.{data.skillLevel})</span>
    </div>
  );
}

// ── Toast: owner gets notified when worker finishes a session ─────────────
export function OwnerWorkToast({ data, onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`work-toast${fading ? " work-toast-fade-out" : ""}`}>
      <span className="work-toast-icon">⚒</span>
      <span>
        <strong className="work-toast-name">{data.workerUsername}</strong> worked for you!&nbsp;
        <strong className="work-toast-gold">+{data.ownerGold}G</strong>
      </span>
    </div>
  );
}

// ── Toast: owner sends a hire request ─────────────────────────────────────
export function HireRequestToast({ data, onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 3600);
    const t2 = setTimeout(onDone, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`work-toast work-toast-hire${fading ? " work-toast-fade-out" : ""}`}>
      <span className="work-toast-icon">📋</span>
      <span>
        <strong className="work-toast-name">{data.requesterUsername}</strong> wants to work at your building!
      </span>
      <span className="work-toast-exp">Open the signpost to accept or reject.</span>
    </div>
  );
}

// ── Toast: worker hire request was accepted ────────────────────────────────
export function AcceptedToast({ data, onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 3600);
    const t2 = setTimeout(onDone, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`work-toast work-toast-hire${fading ? " work-toast-fade-out" : ""}`}>
      <span className="work-toast-icon">✓</span>
      <span>
        Your work application has been <strong>accepted</strong>!
      </span>
      <span className="work-toast-exp">
        {data.buildingName} Lv.{data.buildingLevel} — open the signpost to start working.
      </span>
    </div>
  );
}

// ── Toast: hire request was rejected ──────────────────────────────────────
export function RejectedToast({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`work-toast work-toast-rejected${fading ? " work-toast-fade-out" : ""}`}>
      <span className="work-toast-icon">✗</span>
      <span>Your hire request was <strong>rejected</strong>.</span>
    </div>
  );
}

// ── Toast: owner notified when worker resigns ──────────────────────────────
export function ResignedToast({ data, onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`work-toast work-toast-fired${fading ? " work-toast-fade-out" : ""}`}>
      <span className="work-toast-icon">🚪</span>
      <span><strong className="work-toast-name">{data.workerUsername}</strong> has resigned from your building.</span>
      <span className="work-toast-exp">{data.buildingName} Lv.{data.buildingLevel}</span>
    </div>
  );
}

// ── Toast: player is fired ─────────────────────────────────────────────────
export function FiredToast({ data, onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`work-toast work-toast-fired${fading ? " work-toast-fade-out" : ""}`}>
      <span className="work-toast-icon">🚫</span>
      <span>You were fired from your Workplace!</span>
      {data?.buildingName && (
        <span className="work-toast-exp">{data.buildingName} Lv.{data.buildingLevel}</span>
      )}
    </div>
  );
}
