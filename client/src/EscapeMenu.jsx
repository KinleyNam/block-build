import { useState, useEffect } from "react";
import titleBgImg     from "./assets/UIElement/title-background.png";
import mainMenuImg    from "./assets/UIElement/main-menu-with-Chains.png";
import landImage      from "./assets/UIElement/land-Image.png";
import maleAvatarImg  from "./assets/player/profile.png";
import bg_blacksmith1 from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl1.png";
import bg_blacksmith2 from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl2.png";
import bg_blacksmith3 from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl3.png";
import bg_carpentry1  from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl1.png";
import bg_carpentry2  from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl2.png";
import bg_carpentry3  from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl3.png";
import bg_magic1      from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl1.png";
import bg_magic2      from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl2.png";
import bg_magic3      from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl3.png";
import gameState, { LAND_PARCELS } from "./game/gameState";
import { getAllLandOwners, getMyBuildings } from "./game/contractService";
import "./BuyAndSell.css";
import "./EscapeMenu.css";

const SKILL_LABELS = {
  carpentry:     "Carpentry",
  blacksmithing: "Blacksmithing",
  magicResearch: "Magic Research",
};

function formatSkills(skills) {
  return Object.entries(SKILL_LABELS).map(([key, label]) => {
    const { exp = 0, level = 1 } = skills?.[key] ?? {};
    const toNext = level * 100 - exp;
    return { name: `${label} (Level-${level})`, sub: `to-next: ${toNext} exp` };
  });
}

const NFT_CATEGORIES = ["Land", "Building"];

const BUILDING_IMGS = [
  [bg_blacksmith1, bg_blacksmith2, bg_blacksmith3],
  [bg_carpentry1,  bg_carpentry2,  bg_carpentry3],
  [bg_magic1,      bg_magic2,      bg_magic3],
];
const BUILDING_TYPE_NAMES = ["Blacksmith", "Carpentry", "Magic Research"];

function buildingImg(buildingType, level) {
  return BUILDING_IMGS[buildingType]?.[level - 1] ?? null;
}

function NftTab({ category }) {
  const [landNfts,     setLandNfts]     = useState([]);
  const [buildingNfts, setBuildingNfts] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    let cancelled = false;
    const address = gameState.walletAddress?.toLowerCase();

    if (!address) {
      setLoading(false);
      setError("No wallet connected.");
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getAllLandOwners(),
      getMyBuildings(address),
    ]).then(([owners, buildings]) => {
      if (cancelled) return;

      const ownedLand = LAND_PARCELS
        .filter(p => owners[p.tokenId - 1]?.toLowerCase() === address)
        .map(p => ({ tokenId: p.tokenId, label: p.label }));

      const ownedBuildings = buildings.map(b => ({
        tokenId:  b.tokenId,
        name:     BUILDING_TYPE_NAMES[b.buildingType] ?? "Building",
        type:     b.buildingType,
        level:    b.level,
        placed:   b.placed,
        parcelId: b.parcelId,
      }));

      setLandNfts(ownedLand);
      setBuildingNfts(ownedBuildings);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError("Failed to load NFTs.");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="emenu__tab emenu__nft-status">Loading NFTs…</div>;
  }
  if (error) {
    return <div className="emenu__tab emenu__nft-status">{error}</div>;
  }

  if (category === "Building") {
    if (buildingNfts.length === 0) {
      return <div className="emenu__tab emenu__nft-status">No building NFTs owned.</div>;
    }
    return (
      <div className="emenu__tab">
        <div className="buy-sell-screen__building-list emenu__nft-offset">
          {buildingNfts.map(b => (
            <button key={b.tokenId} className="buy-sell-screen__building-item" type="button">
              <img
                className="buy-sell-screen__building-thumb"
                src={buildingImg(b.type, b.level)}
                alt={b.name}
              />
              <span>
                {b.name} — Lvl {b.level}
                {b.placed ? ` · Parcel ${b.parcelId}` : " · Inventory"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Land
  if (landNfts.length === 0) {
    return <div className="emenu__tab emenu__nft-status">No land NFTs owned.</div>;
  }
  return (
    <div className="emenu__tab">
      <div className="buy-sell-screen__grid emenu__nft-offset">
        {landNfts.map(item => (
          <button key={item.tokenId} className="buy-sell-screen__item" type="button">
            <img className="buy-sell-screen__item-thumb" src={landImage} alt={item.label} />
            <span>{item.label}</span>
            <span>Token #{item.tokenId}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileTab() {
  const [profile, setProfile] = useState({
    username: gameState.username,
    gold:     gameState.gold,
    skills:   formatSkills(gameState.skills),
  });

  useEffect(() => {
    const sync = () => setProfile({
      username: gameState.username,
      gold:     gameState.gold,
      skills:   formatSkills(gameState.skills),
    });
    gameState.on(sync);
    return () => gameState.off(sync);
  }, []);

  return (
    <div className="emenu__tab emenu__tab--profile">
      <div className="emenu__profile-top">
        <img className="emenu__avatar" src={maleAvatarImg} alt="avatar" />
        <div className="emenu__profile-stats">
          <div className="emenu__stat emenu__stat--name">{profile.username}</div>
          <div className="emenu__stat">Gold: {profile.gold}G</div>
        </div>
      </div>
      <div className="emenu__skills-box">
        <div className="emenu__skills-title">Skill Lvl</div>
        {profile.skills.map((s, i) => (
          <div key={i} className="emenu__skill">
            <div className="emenu__skill-name">{s.name}</div>
            <div className="emenu__skill-sub">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  ["nft",     "My NFTs"],
  ["profile", "Profile"],
];

export default function EscapeMenu({ onClose }) {
  const [activeTab, setActiveTab] = useState("nft");
  const [navIdx,    setNavIdx]    = useState(0);

  const hasNav = activeTab === "nft";
  const currentCategory = NFT_CATEGORIES[navIdx] || "Land";

  const handlePrevCategory = () => setNavIdx(prev => Math.max(0, prev - 1));
  const handleNextCategory = () => setNavIdx(prev => Math.min(NFT_CATEGORIES.length - 1, prev + 1));

  return (
    <div className="emenu">
      <img className="emenu__bg-img" src={titleBgImg} alt="" />

      <div className="emenu__panels">

        {/* ── LEFT PANEL ── */}
        <div className="emenu__nav-wrap">
          <img className="emenu__panel" src={mainMenuImg} alt="" />
          <div className="emenu__nav">
            <button className="button-shell emenu__nav-btn" type="button" onClick={onClose}>
              <span className="button-shell__inner">Continue</span>
            </button>
            {TABS.map(([key, label]) => (
              <button
                key={key}
                className={`button-shell emenu__nav-btn${activeTab === key ? " emenu__nav-btn--active" : ""}`}
                type="button"
                onClick={() => setActiveTab(key)}
              >
                <span className="button-shell__inner">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="emenu__content-wrap">
          <img className="emenu__panel" src={mainMenuImg} alt="" />
          <div className="emenu__content">
            {hasNav && (
              <div className="emenu__bar">
                <button className="emenu__arrow" onClick={handlePrevCategory} disabled={navIdx === 0}>◄</button>
                <span className="emenu__bar-label">{currentCategory}</span>
                <button className="emenu__arrow" onClick={handleNextCategory} disabled={navIdx === NFT_CATEGORIES.length - 1}>►</button>
              </div>
            )}
            {activeTab === "nft"     && <NftTab category={currentCategory} />}
            {activeTab === "profile" && <ProfileTab />}
          </div>
        </div>

      </div>
    </div>
  );
}
