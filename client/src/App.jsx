import { useState } from "react";
import Game from "./game/Game";
import logoImg from "./assets/UIElement/Block-Build-Logo.png";
import menuPanelImg from "./assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "./assets/UIElement/title-background.png";
import userCreationBackgroundImg from "./assets/UIElement/user-creation-background.png";
import malePreviewImg from "./assets/player/male-player-character.png";
import femalePreviewImg from "./assets/player/female-player-character.png";
import { createUser, getSkills, getUserByWallet } from "./api";
import gameState from "./game/gameState";
import { connectWallet } from "./game/wallet";
import { getGoldBalance, claimFaucet } from "./game/contractService";
import "./App.css";

const GENDERS = [
  { label: "Male", preview: malePreviewImg, className: "character-screen__preview--male" },
  { label: "Female", preview: femalePreviewImg, className: "character-screen__preview--female" },
];

function App() {
  const [screen,        setScreen]        = useState("title");
  const [username,      setUsername]      = useState("");
  const [genderIndex,   setGenderIndex]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletModal,   setWalletModal]   = useState(false);

  async function handleConnectWallet() {
    setWalletLoading(true);
    setError("");
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      gameState.walletAddress = address;

      // Sync gold balance from chain
      try {
        const balance = await getGoldBalance(address);
        gameState.gold = balance;
        gameState._emit();
      } catch {
        console.warn("Could not reach contracts — are they deployed on this network?");
      }

      // Check for a returning player by wallet address
      try {
        const existing = await getUserByWallet(address);
        const skills   = await getSkills(existing.username);
        gameState.setUser(existing, skills);
        gameState.lastScene = existing.lastScene || null;
        gameState.lastX     = existing.lastX     ?? null;
        gameState.lastY     = existing.lastY     ?? null;
        setScreen("game"); // skip character creation
      } catch {
        // No existing account — user will click Start to create one
      }
    } catch (err) {
      setError(err.message || "Wallet connection failed.");
    } finally {
      setWalletLoading(false);
    }
  }

  async function handleStart() {
    if (!username.trim()) { setError("Please enter a username."); return; }
    setLoading(true);
    setError("");
    try {
      const gender   = GENDERS[genderIndex].label;
      const userData = await createUser(username.trim(), gender, walletAddress);
      const skills   = await getSkills(userData.username);
      gameState.setUser(userData, skills);

      // New player — claim starting gold from faucet
      try {
        await claimFaucet();
        const balance = await getGoldBalance(walletAddress);
        gameState.gold = balance;
        gameState._emit();
      } catch { /* contracts not deployed yet */ }

      setScreen("game");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (screen === "game") {
    return <Game />;
  }

  if (screen === "character") {
    const gender = GENDERS[genderIndex];

    return (
      <div className="character-screen">
        <img
          className="character-screen__background"
          src={userCreationBackgroundImg}
          alt=""
        />

        <div className="character-screen__content">
          <div className="character-screen__header button-shell button-shell--small">
            <span className="button-shell__inner">Please type your username:</span>
          </div>

          <input
            className="character-screen__input"
            type="text"
            value={username}
            maxLength={18}
            placeholder="_____"
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
          />

          {error && <p className="character-screen__error">{error}</p>}

          <div className="character-screen__gender-row">
            <button
              className="character-screen__arrow"
              type="button"
              aria-label="Previous gender"
              onClick={() => setGenderIndex((genderIndex + GENDERS.length - 1) % GENDERS.length)}
            >
              <span aria-hidden="true">&#9664;</span>
            </button>

            <div className="character-screen__gender-controls">
              <div className="button-shell button-shell--small">
                <span className="button-shell__inner">Gender</span>
              </div>
              <div className="button-shell button-shell--small button-shell--value">
                <span className="button-shell__inner">{gender.label}</span>
              </div>
            </div>

            <button
              className="character-screen__arrow"
              type="button"
              aria-label="Next gender"
              onClick={() => setGenderIndex((genderIndex + 1) % GENDERS.length)}
            >
              <span aria-hidden="true">&#9654;</span>
            </button>
          </div>

          <div className="character-screen__preview-wrap">
            <img
              className={`character-screen__preview ${gender.className}`}
              src={gender.preview}
              alt={gender.label}
            />
          </div>

          <button
            className="character-screen__next button-shell"
            type="button"
            onClick={handleStart}
            disabled={loading}
          >
            <span className="button-shell__inner">
              {loading ? "Creating..." : "Next"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Title screen
  return (
    <div className="title-screen">
      <img className="title-screen__background" src={titleBackgroundImg} alt="" />

      <div className="title-screen__ground" />

      {walletModal && (
        <div className="wallet-modal__overlay" onClick={() => setWalletModal(false)}>
          <div className="wallet-modal" onClick={e => e.stopPropagation()}>
            <img className="wallet-modal__panel" src={menuPanelImg} alt="" />
            <div className="wallet-modal__content">
              <p className="wallet-modal__text">Please connect your wallet</p>
              <button
                className="button-shell wallet-modal__btn"
                type="button"
                onClick={() => setWalletModal(false)}
              >
                <span className="button-shell__inner">Okay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="title-screen__content">
        <img className="title-screen__logo" src={logoImg} alt="Block Build" />

        <div className="title-screen__panel-wrap">
          <img className="title-screen__panel" src={menuPanelImg} alt="" />

          <div className="title-screen__buttons">
            <button
              className="button-shell title-screen__menu-btn"
              type="button"
              onClick={() => walletAddress ? setScreen("character") : setWalletModal(true)}
            >
              <span className="button-shell__inner">Start</span>
            </button>

            {walletAddress ? (
              <div className="button-shell title-screen__menu-btn">
                <span className="button-shell__inner">
                  {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                className="button-shell title-screen__menu-btn"
                type="button"
                onClick={handleConnectWallet}
                disabled={walletLoading}
              >
                <span className="button-shell__inner">
                  {walletLoading ? "Connecting..." : "Connect Wallet"}
                </span>
              </button>
            )}

            {error && <p className="title-screen__error">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
