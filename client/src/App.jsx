import { useState } from "react";
import Game from "./game/Game";
import logoImg from "./assets/UIElement/Block-Build-Logo.png";
import menuPanelImg from "./assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "./assets/UIElement/title-background.png";
import userCreationBackgroundImg from "./assets/UIElement/user-creation-background.png";
import malePreviewImg from "./assets/player/male-player-character.png";
import femalePreviewImg from "./assets/player/female-player-character.png";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const GENDERS = [
  { label: "Male", preview: malePreviewImg, className: "character-screen__preview--male" },
  { label: "Female", preview: femalePreviewImg, className: "character-screen__preview--female" },
];

function generateDummyWallet() {
  return "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function App() {
  const [screen, setScreen] = useState("title");
  const [username, setUsername] = useState("");
  const [genderIndex, setGenderIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (screen === "game") {
    return <Game user={user} />;
  }

  if (screen === "character") {
    const gender = GENDERS[genderIndex];

    async function handleNext() {
      const trimmed = username.trim();
      if (!trimmed) {
        setError("Please enter a username.");
        return;
      }
      setError("");
      setLoading(true);
      try {
        const walletAddress = generateDummyWallet();
        const res = await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmed, walletAddress, gender: gender.label }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        setUser(data);
        setScreen("game");
      } catch {
        setError("Could not reach the server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

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
            onChange={(event) => { setUsername(event.target.value); setError(""); }}
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
            disabled={loading}
            onClick={handleNext}
          >
            <span className="button-shell__inner">{loading ? "..." : "Next"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="title-screen">
      <img className="title-screen__background" src={titleBackgroundImg} alt="" />

      <div className="title-screen__ground" />

      <div className="title-screen__content">
        <img className="title-screen__logo" src={logoImg} alt="Block Build" />
        <div className="title-screen__panel-wrap">
          <img className="title-screen__panel" src={menuPanelImg} alt="" />
          <button
            className="title-screen__start"
            type="button"
            onClick={() => setScreen("character")}
          >
            <span className="title-screen__start-inner" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
