import { useState, useEffect } from "react";
import "./PvPRequestUI.css";

// ── Panel shown to the player who pressed G (challenger) ──────────────────────
export function PvPChallengePanel({ targetUsername, onSend, onCancel, myGold, pending }) {
  const [bet, setBet] = useState("");
  const [error, setError] = useState("");

  const handleSend = () => {
    const amount = parseInt(bet, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid gold amount.");
      return;
    }
    if (myGold != null && amount > myGold) {
      setError(`Not enough gold. You have ${myGold}G.`);
      return;
    }
    setError("");
    onSend(amount);
  };

  return (
    <div className="pvp-overlay">
      <div className="pvp-panel">
        <h2 className="pvp-title">⚔ PvP Challenge</h2>
        <p className="pvp-text">
          Challenge <span className="pvp-name">{targetUsername}</span> to a duel?
        </p>
        <p className="pvp-subtext">Both players bet the same amount. Loser pays the winner.</p>

        <label className="pvp-label">Bet Gold</label>
        <input
          className="pvp-input"
          type="number"
          min="1"
          placeholder="Amount"
          value={bet}
          onChange={e => setBet(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          autoFocus
        />
        {error && <p className="pvp-error">{error}</p>}
        {pending && <p className="pvp-subtext">Confirm in MetaMask to lock gold…</p>}

        {!pending && (
          <div className="pvp-buttons">
            <button className="pvp-btn pvp-btn-send" onClick={handleSend}>
              Send Request
            </button>
            <button className="pvp-btn pvp-btn-cancel" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Toast shown to challenger when opponent declines ──────────────────────────
export function PvPToast({ username, onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2600);
    const doneTimer = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`pvp-toast${fading ? " pvp-toast-fade-out" : ""}`}>
      <span className="pvp-toast-icon">✕</span>
      <span className="pvp-toast-name">{username}</span> declined your PvP request
    </div>
  );
}

// ── Panel shown to the player who received a challenge ────────────────────────
export function PvPReceivePanel({ challengerUsername, betAmount, onAccept, onDecline, pending, error }) {
  return (
    <div className="pvp-overlay">
      <div className="pvp-panel">
        <h2 className="pvp-title">⚔ PvP Request</h2>
        <p className="pvp-text">
          <span className="pvp-name">{challengerUsername}</span> wants to fight you!
        </p>
        <p className="pvp-bet">
          Bet: <span className="pvp-gold">{betAmount} Gold</span> each
        </p>
        <p className="pvp-subtext">
          Winner takes all. Both wallets must have enough gold.
        </p>

        {pending && <p className="pvp-subtext">Waiting for MetaMask approval…</p>}
        {error   && <p className="pvp-error">{error}</p>}

        {!pending && (
          <div className="pvp-buttons">
            <button className="pvp-btn pvp-btn-send" onClick={onAccept}>
              Accept ⚔
            </button>
            <button className="pvp-btn pvp-btn-cancel" onClick={onDecline}>
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
