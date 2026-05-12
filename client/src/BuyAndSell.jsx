import { useState, useEffect } from "react";
import menuPanelImg from "./assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "./assets/UIElement/title-background.png";
import PlaceHolder from "./assets/UIElement/land-Image.png";
import "./BuyAndSell.css";
import gameState, { LAND_PARCELS } from "./game/gameState";

const TABS = ["Land", "Building"];

const STATIC_ACTION_DATA = {
  Buy: {
    Building: [
      { id: "buy-b-1", label: "Magic Research Facility", price: "250G" },
      { id: "buy-b-2", label: "Carpentry Facility",      price: "200G" },
      { id: "buy-b-3", label: "Blacksmithing Facility",  price: "220G" },
    ],
  },
  "List NFTs": {
    Land: [
      { id: "list-l-1", label: "B-1", price: "130G" },
      { id: "list-l-2", label: "B-2", price: "150G" },
      { id: "list-l-3", label: "B-3", price: "170G" },
    ],
    Building: [
      { id: "list-b-1", label: "Magic Research Facility", price: "300G" },
      { id: "list-b-2", label: "Carpentry Facility",      price: "260G" },
      { id: "list-b-3", label: "Blacksmithing Facility",  price: "280G" },
    ],
  },
  Market: {
    Land: [
      { id: "mkt-l-1", label: "C-1", price: "90G"  },
      { id: "mkt-l-2", label: "C-2", price: "110G" },
      { id: "mkt-l-3", label: "C-3", price: "95G"  },
    ],
    Building: [
      { id: "mkt-b-1", label: "Magic Research Facility", price: "230G" },
      { id: "mkt-b-2", label: "Carpentry Facility",      price: "180G" },
      { id: "mkt-b-3", label: "Blacksmithing Facility",  price: "210G" },
    ],
  },
};

const ACTIONS = ["Buy", "List NFTs", "Market"];

export default function BuyAndSell({ onBack }) {
  const [action, setAction]         = useState("Buy");
  const [tabIndex, setTabIndex]     = useState(0);
  const [selected, setSelected]     = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [buyError, setBuyError]     = useState("");
  const [ownership, setOwnership]   = useState({ ...gameState.landOwnership });
  const [gold, setGold]             = useState(gameState.gold);

  useEffect(() => {
    const sync = () => {
      setOwnership({ ...gameState.landOwnership });
      setGold(gameState.gold);
    };
    gameState.on(sync);
    return () => gameState.off(sync);
  }, []);

  const tab = TABS[tabIndex];

  function getItems() {
    if (action === "Buy" && tab === "Land") {
      return LAND_PARCELS.map(p => ({
        id:    p.id,
        label: p.label,
        price: `${p.price}G`,
        owner: ownership[p.id] || null,
      }));
    }
    return STATIC_ACTION_DATA[action]?.[tab] ?? [];
  }

  const items = getItems();

  function handleActionBtn(a) {
    setAction(a);
    setSelected(null);
    setConfirming(false);
    setBuyError("");
  }

  function handleSelectItem(item) {
    if (item.owner) return;
    setSelected(item);
    setConfirming(true);
    setBuyError("");
  }

  function handleConfirmYes() {
    if (action === "Buy" && tab === "Land" && selected) {
      const result = gameState.buyLand(selected.id);
      if (!result.ok) {
        setBuyError(
          result.reason === "insufficient_gold"
            ? "Not enough gold!"
            : "Cannot buy this land."
        );
        return;
      }
    }
    setConfirming(false);
    setSelected(null);
    setBuyError("");
  }

  function handleConfirmNo() {
    setConfirming(false);
    setBuyError("");
  }

  function prevTab() {
    setTabIndex((tabIndex + TABS.length - 1) % TABS.length);
    setSelected(null);
    setConfirming(false);
    setBuyError("");
  }

  function nextTab() {
    setTabIndex((tabIndex + 1) % TABS.length);
    setSelected(null);
    setConfirming(false);
    setBuyError("");
  }

  return (
    <div className="buy-sell-screen">

      <img
        className="buy-sell-screen__background"
        src={titleBackgroundImg}
        alt=""
      />

      <div className="buy-sell-screen__panels">

        {/* ── LEFT PANEL — action buttons ─────────────────────────── */}
        <div className="buy-sell-screen__panel-wrap">
          <img className="buy-sell-screen__panel" src={menuPanelImg} alt="" />
          <div className="buy-sell-screen__panel-content">

            {ACTIONS.map((a) => (
              <button
                key={a}
                className={`button-shell buy-sell-screen__action-btn${action === a ? " buy-sell-screen__action-btn--active" : ""}`}
                type="button"
                onClick={() => handleActionBtn(a)}
              >
                <span className="button-shell__inner">{a}</span>
              </button>
            ))}

            <button
              className="button-shell buy-sell-screen__action-btn"
              type="button"
              onClick={onBack}
            >
              <span className="button-shell__inner">Back</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL — items display ──────────────────────────── */}
        <div className="buy-sell-screen__panel-wrap buy-sell-screen__panel-wrap--right">
          <img className="buy-sell-screen__panel" src={menuPanelImg} alt="" />
          <div className="buy-sell-screen__panel-content">

            <div className="buy-sell-screen__nav">
              <button
                className="buy-sell-screen__arrow"
                type="button"
                aria-label="Previous tab"
                onClick={prevTab}
              >
                <span aria-hidden="true">&#9664;</span>
              </button>
              <span className="buy-sell-screen__tab-label">{tab}</span>
              <button
                className="buy-sell-screen__arrow"
                type="button"
                aria-label="Next tab"
                onClick={nextTab}
              >
                <span aria-hidden="true">&#9654;</span>
              </button>
            </div>

            <div className="buy-sell-screen__items-area">

              {confirming ? (
                <div className="buy-sell-screen__confirm">
                  <p className="buy-sell-screen__confirm-text">
                    Are you sure you want to {action} {tab} {selected?.label}
                    {action === "Buy" && tab === "Land" && selected
                      ? ` for ${selected.price}?`
                      : "?"}
                  </p>
                  {buyError && (
                    <p className="buy-sell-screen__confirm-error">{buyError}</p>
                  )}
                  <div className="buy-sell-screen__confirm-buttons">
                    <button
                      className="button-shell buy-sell-screen__confirm-yes"
                      type="button"
                      onClick={handleConfirmYes}
                    >
                      <span className="button-shell__inner">Yes</span>
                    </button>
                    <button
                      className="button-shell buy-sell-screen__confirm-no"
                      type="button"
                      onClick={handleConfirmNo}
                    >
                      <span className="button-shell__inner">No</span>
                    </button>
                  </div>
                </div>

              ) : tab === "Land" ? (
                <div className="buy-sell-screen__grid">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className={`buy-sell-screen__item${item.owner ? " buy-sell-screen__item--owned" : ""}`}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      disabled={!!item.owner}
                    >
                      <img
                        className="buy-sell-screen__item-thumb"
                        src={PlaceHolder}
                        alt={item.label}
                      />
                      <span>{item.label}</span>
                      {item.owner
                        ? <span className="buy-sell-screen__item-owned-label">
                            {item.owner === gameState.username ? "Yours" : "Taken"}
                          </span>
                        : <span>{item.price}</span>
                      }
                    </button>
                  ))}
                </div>

              ) : (
                <div className="buy-sell-screen__building-list">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className="buy-sell-screen__building-item"
                      type="button"
                      onClick={() => handleSelectItem(item)}
                    >
                      <img
                        className="buy-sell-screen__building-thumb"
                        src={PlaceHolder}
                        alt={item.label}
                      />
                      <span>{item.label} — {item.price}</span>
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
