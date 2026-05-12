import { useState, useEffect } from "react";
import titleBgImg     from "./assets/UIElement/title-background.png";
import mainMenuImg    from "./assets/UIElement/main-menu-with-Chains.png";
import buttonBgImg    from "./assets/UIElement/Button-Background.png";
import landImage      from "./assets/UIElement/land-Image.png";
import maleAvatarImg  from "./assets/player/profile.png";
import gameState      from "./game/gameState";
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

const REQUESTS = {
  capacity: "0/2",
  items: Array.from({ length: 10 }, (_, i) => `User Nameless_${i + 1} wants\nto work for you`),
};

const NFT_CATEGORIES = ["Land", "Building"];
const NFT_DATA = {
  Land: [
    { label: "A-1", price: "140G" },
    { label: "A-1", price: "130G" },
    { label: "A-1", price: "120G" },
  ],
  Building: [
    { label: "Magic Research Facility", price: "250G" },
    { label: "Carpentry Facility",      price: "250G" },
    { label: "Blacksmithing Facility",  price: "250G" },
  ],
};

function NftTab({ items, category }) {
  if (category === "Building") {
    return (
      <div className="emenu__tab">
        <div className="buy-sell-screen__building-list emenu__nft-offset">
          {items.map((item, i) => (
            <button key={i} className="buy-sell-screen__building-item" type="button">
              <img className="buy-sell-screen__building-thumb" src={landImage} alt={item.label} />
              <span>{item.label} — {item.price}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="emenu__tab">
      <div className="buy-sell-screen__grid emenu__nft-offset">
        {items.map((item, i) => (
          <button key={i} className="buy-sell-screen__item" type="button">
            <img className="buy-sell-screen__item-thumb" src={landImage} alt={item.label} />
            <span>{item.label}</span>
            <span>{item.price}</span>
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

const REQ_PER_PAGE = 4;

function RequestTab() {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(REQUESTS.items.length / REQ_PER_PAGE);
  const pageItems  = REQUESTS.items.slice(page * REQ_PER_PAGE, page * REQ_PER_PAGE + REQ_PER_PAGE);

  return (
    <div className="emenu__tab emenu__tab--request">
      <div className="emenu__req-capacity">Capacity: {REQUESTS.capacity}</div>
      <div className="emenu__req-list">
        {pageItems.map((msg, i) => (
          <div key={i} className="emenu__req-card" style={{ backgroundImage: `url(${buttonBgImg})` }}>
            <div className="emenu__req-text-box">
              <span className="emenu__req-text">{msg}</span>
            </div>
            <div className="emenu__req-actions">
              <button className="emenu__req-btn emenu__req-btn--accept">✓</button>
              <button className="emenu__req-btn emenu__req-btn--reject">✗</button>
            </div>
          </div>
        ))}
      </div>
      <div className="emenu__req-pagination">
        <button
          className="emenu__req-page-btn"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >◄</button>
        <span className="emenu__req-page-label">{page + 1} / {totalPages}</span>
        <button
          className="emenu__req-page-btn"
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
        >►</button>
      </div>
    </div>
  );
}

const TABS = [
  ["nft",     "My NFTs"],
  ["profile", "Profile"],
  ["request", "Request"],
];

export default function EscapeMenu({ onClose }) {
  const [activeTab, setActiveTab] = useState("nft");
  const [navIdx,    setNavIdx]    = useState(0);

  const hasNav = activeTab === "nft";
  const currentCategory = NFT_CATEGORIES[navIdx] || "Land";
  const currentItems = NFT_DATA[currentCategory] || [];

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
            {activeTab === "nft"     && <NftTab items={currentItems} category={currentCategory} />}
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "request" && <RequestTab />}
          </div>
        </div>

      </div>
    </div>
  );
}
