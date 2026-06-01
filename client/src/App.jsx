import { useState } from "react";
import Game from "./game/Game";
import CharacterPreview from "./CharacterPreview";
import logoImg from "./assets/UIElement/Block-Build-Logo.png";
import menuPanelImg from "./assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "./assets/UIElement/title-background.png";
import userCreationBackgroundImg from "./assets/UIElement/user-creation-background.png";
import { MALE_HAIR_COUNT, FEMALE_HAIR_COUNT, WEAPON_TIERS_LIST, WEAPON_TYPES_LIST } from "./game/assets";
import { createUser, getSkills, getUserByWallet } from "./api";
import gameState from "./game/gameState";
import { connectWallet } from "./game/wallet";
import { getGoldBalance, claimFaucet } from "./game/contractService";
import "./App.css";

const GENDERS = ["Male", "Female"];

const SKIN_COLORS    = ["#f5c89a", "#e8a96a", "#c97a40", "#8b5a2b", "#5c3317"];
const OUTFIT_COLORS  = ["#e8e0d0", "#4a90d9", "#4ca84c", "#e07c2a", "#9b4dca"];
const HAIR_COLORS    = ["#2d1205", "#7a3b10", "#aa1a00", "#c8a020", "#111111"];
// Weapon material colours: Wooden / Bronze / Iron / Golden / Diamond
const WEAPON_TIER_COLORS = ["#8B4513", "#cd7f32", "#a8a9ad", "#ffd700", "#89cff0"];

function App() {
  const [screen,        setScreen]        = useState("title");
  const [username,      setUsername]      = useState("");
  const [genderIndex,   setGenderIndex]   = useState(0);
  const [skinIndex,     setSkinIndex]     = useState(1); // 1-5
  const [hairIndex,     setHairIndex]     = useState(1); // 1-5
  const [outfitIndex,   setOutfitIndex]   = useState(0); // 0-4
  const [weaponTier,    setWeaponTier]    = useState(0); // 0=Wooden … 4=Diamond
  const [weaponType,    setWeaponType]    = useState(0); // 0=Sword, 1=Axe, 2=Pickaxe
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
        // Never restore directly into the PvP arena — redirect to commercial district instead
        const safeScene = existing.lastScene === "PvPArena"
          ? "ComDistrictScene"
          : (existing.lastScene || null);
        gameState.lastScene  = safeScene;
        gameState.lastX      = existing.lastScene === "PvPArena" ? null : (existing.lastX ?? null);
        gameState.lastY      = null;
        gameState.pendingPvP = null;
        // Restore customization state for the React UI
        if (existing.customization) {
          setSkinIndex(existing.customization.skinIndex ?? 1);
          setHairIndex(existing.customization.hairIndex ?? 1);
          setOutfitIndex(existing.customization.outfitIndex ?? 0);
          setWeaponTier(existing.customization.weaponTier ?? 0);
          setWeaponType(existing.customization.weaponType ?? 0);
          setGenderIndex(existing.gender === "Female" ? 1 : 0);
        }
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
      const gender        = GENDERS[genderIndex];
      const customization = { skinIndex, hairIndex, outfitIndex, weaponTier, weaponType };
      const userData      = await createUser(username.trim(), gender, walletAddress, customization);
      const skills        = await getSkills(userData.username);
      gameState.customization = customization;
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
    const gender       = GENDERS[genderIndex];
    const maxHairStyle = (gender === "Female" ? FEMALE_HAIR_COUNT : MALE_HAIR_COUNT) / 5;
    const hairStyle    = Math.floor((hairIndex - 1) / 5); // 0-based style group
    const hairColor    = (hairIndex - 1) % 5;              // 0-based color within group

    function cycleGender(dir) {
      const next = (genderIndex + dir + GENDERS.length) % GENDERS.length;
      setGenderIndex(next);
      const newMaxStyle = (GENDERS[next] === "Female" ? FEMALE_HAIR_COUNT : MALE_HAIR_COUNT) / 5;
      const curStyle = Math.floor((hairIndex - 1) / 5);
      const curColor = (hairIndex - 1) % 5;
      if (curStyle >= newMaxStyle) setHairIndex((newMaxStyle - 1) * 5 + curColor + 1);
    }

    return (
      <div className="character-screen">
        <img className="character-screen__background" src={userCreationBackgroundImg} alt="" />

        <div className="cs-page">

          {/* ── Left panel — all controls ── */}
          <aside className="cs-panel">
            <h2 className="cs-panel__title">
              <span className="cs-panel__title-deco">✦</span>
              Character Creation
              <span className="cs-panel__title-deco">✦</span>
            </h2>
            <div className="cs-panel__divider" />

            {/* Username */}
            <div className="cs-section">
              <label className="cs-section__label">Username</label>
              <input
                className="cs-input"
                type="text"
                value={username}
                maxLength={18}
                placeholder="Enter name…"
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
              />
              {error && <p className="cs-error">{error}</p>}
            </div>

            {/* Gender */}
            <div className="cs-section">
              <label className="cs-section__label">Gender</label>
              <div className="cs-gender-row">
                <button className="cs-arrow" type="button" aria-label="Previous"
                  onClick={() => cycleGender(-1)}>
                  &#9664;
                </button>
                <span className="cs-gender-value">{gender}</span>
                <button className="cs-arrow" type="button" aria-label="Next"
                  onClick={() => cycleGender(1)}>
                  &#9654;
                </button>
              </div>
            </div>

            <div className="cs-panel__divider" />

            {/* Skin tone */}
            <div className="cs-section">
              <label className="cs-section__label">Skin Tone</label>
              <div className="cs-swatches">
                {SKIN_COLORS.map((col, i) => (
                  <button key={i} type="button" aria-label={`Skin ${i + 1}`}
                    className={`cs-swatch${skinIndex === i + 1 ? " cs-swatch--active" : ""}`}
                    style={{ background: col }}
                    onClick={() => setSkinIndex(i + 1)}
                  />
                ))}
              </div>
            </div>

            {/* Hair style — cycle through style groups */}
            <div className="cs-section">
              <label className="cs-section__label">Hair Style</label>
              <div className="cs-gender-row">
                <button className="cs-arrow" type="button" aria-label="Previous style"
                  onClick={() => { const s = (hairStyle - 1 + maxHairStyle) % maxHairStyle; setHairIndex(s * 5 + hairColor + 1); }}>
                  &#9664;
                </button>
                <span className="cs-gender-value">{hairStyle + 1} / {maxHairStyle}</span>
                <button className="cs-arrow" type="button" aria-label="Next style"
                  onClick={() => { const s = (hairStyle + 1) % maxHairStyle; setHairIndex(s * 5 + hairColor + 1); }}>
                  &#9654;
                </button>
              </div>
            </div>

            {/* Hair color — 5 swatches matching the per-style color schema */}
            <div className="cs-section">
              <label className="cs-section__label">Hair Color</label>
              <div className="cs-swatches">
                {HAIR_COLORS.map((col, i) => (
                  <button key={i} type="button"
                    aria-label={["Darkbrown","Brown","Red","Yellow","Black"][i]}
                    className={`cs-swatch${hairColor === i ? " cs-swatch--active" : ""}`}
                    style={{ background: col }}
                    onClick={() => setHairIndex(hairStyle * 5 + i + 1)}
                  />
                ))}
              </div>
            </div>

            {/* Outfit colour */}
            <div className="cs-section">
              <label className="cs-section__label">Outfit</label>
              <div className="cs-swatches">
                {OUTFIT_COLORS.map((col, i) => (
                  <button key={i} type="button" aria-label={`Outfit ${i + 1}`}
                    className={`cs-swatch${outfitIndex === i ? " cs-swatch--active" : ""}`}
                    style={{ background: col }}
                    onClick={() => setOutfitIndex(i)}
                  />
                ))}
              </div>
            </div>

            {/* Weapon type */}
            <div className="cs-section">
              <label className="cs-section__label">Weapon</label>
              <div className="cs-gender-row">
                <button className="cs-arrow" type="button" aria-label="Previous weapon"
                  onClick={() => setWeaponType(t => (t - 1 + WEAPON_TYPES_LIST.length) % WEAPON_TYPES_LIST.length)}>
                  &#9664;
                </button>
                <span className="cs-gender-value">{WEAPON_TYPES_LIST[weaponType]}</span>
                <button className="cs-arrow" type="button" aria-label="Next weapon"
                  onClick={() => setWeaponType(t => (t + 1) % WEAPON_TYPES_LIST.length)}>
                  &#9654;
                </button>
              </div>
            </div>

            {/* Weapon material */}
            <div className="cs-section">
              <label className="cs-section__label">Material</label>
              <div className="cs-swatches">
                {WEAPON_TIER_COLORS.map((col, i) => (
                  <button key={i} type="button"
                    aria-label={WEAPON_TIERS_LIST[i]}
                    className={`cs-swatch${weaponTier === i ? " cs-swatch--active" : ""}`}
                    style={{ background: col }}
                    onClick={() => setWeaponTier(i)}
                  />
                ))}
              </div>
            </div>

            <div className="cs-panel__divider cs-panel__divider--spacer" />

            {/* Play button */}
            <button className="cs-play-btn" type="button" onClick={handleStart} disabled={loading}>
              {loading ? "Creating…" : "Begin Adventure →"}
            </button>
          </aside>

          {/* ── Right area — animated character preview ── */}
          <div className="cs-stage">
            <CharacterPreview
              gender={gender}
              skinIndex={skinIndex}
              hairIndex={hairIndex}
              outfitIndex={outfitIndex}
              weaponTier={weaponTier}
              weaponType={weaponType}
            />
          </div>

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
