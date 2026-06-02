import { useState, useEffect } from "react";

// UI Images
import menuPanelImg from "./assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "./assets/UIElement/title-background.png";
import PlaceHolder from "./assets/UIElement/land-Image.png";

// Component styling
import "./BuyAndSell.css";

// Game state management
import gameState, { LAND_PARCELS } from "./game/gameState";

// Available tabs
const TABS = ["Land", "Building"];

// Static data for buildings, listings, and market items
const STATIC_ACTION_DATA = {
  Buy: {
    Building: [
      { id: "buy-b-1", label: "Magic Research Facility", price: "250G" },
      { id: "buy-b-2", label: "Carpentry Facility", price: "200G" },
      { id: "buy-b-3", label: "Blacksmithing Facility", price: "220G" },
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
      { id: "list-b-2", label: "Carpentry Facility", price: "260G" },
      { id: "list-b-3", label: "Blacksmithing Facility", price: "280G" },
    ],
  },
  Market: {
    Land: [
      { id: "mkt-l-1", label: "C-1", price: "90G" },
      { id: "mkt-l-2", label: "C-2", price: "110G" },
      { id: "mkt-l-3", label: "C-3", price: "95G" },
    ],
    Building: [
      { id: "mkt-b-1", label: "Magic Research Facility", price: "230G" },
      { id: "mkt-b-2", label: "Carpentry Facility", price: "180G" },
      { id: "mkt-b-3", label: "Blacksmithing Facility", price: "210G" },
    ],
  },
};

// Left-side menu actions
const ACTIONS = ["Buy", "List NFTs", "Market"];

export default function BuyAndSell({ onBack }) {
  // Current selected action
  const [action, setAction] = useState("Buy");

  // Current tab (Land / Building)
  const [tabIndex, setTabIndex] = useState(0);

  // Selected item for confirmation
  const [selected, setSelected] = useState(null);

  // Controls confirmation popup
  const [confirming, setConfirming] = useState(false);

  // Error messages during buying
  const [buyError, setBuyError] = useState("");

  // Local ownership state
  const [ownership, setOwnership] = useState({
    ...gameState.landOwnership,
  });

  // Current player gold
  const [gold, setGold] = useState(gameState.gold);

  // Sync UI whenever game state changes
  useEffect(() => {
    const sync = () => {
      setOwnership({ ...gameState.landOwnership });
      setGold(gameState.gold);
    };

    gameState.on(sync);

    return () => gameState.off(sync);
  }, []);

  // Active tab label
  const tab = TABS[tabIndex];

  // Get items to display based on current action and tab
  function getItems() {
    if (action === "Buy" && tab === "Land") {
      return LAND_PARCELS.map((p) => ({
        id: p.id,
        label: p.label,
        price: `${p.price}G`,
        owner: ownership[p.id] || null,
      }));
    }

    return STATIC_ACTION_DATA[action]?.[tab] ?? [];
  }

  const items = getItems();

  // Change current action
  function handleActionBtn(a) {
    setAction(a);
    setSelected(null);
    setConfirming(false);
    setBuyError("");
  }

  // Select an item
  function handleSelectItem(item) {
    if (item.owner) return;

    setSelected(item);
    setConfirming(true);
    setBuyError("");
  }

  // Confirm purchase/listing
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

  // Cancel confirmation
  function handleConfirmNo() {
    setConfirming(false);
    setBuyError("");
  }

  // Previous tab
  function prevTab() {
    setTabIndex((tabIndex + TABS.length - 1) % TABS.length);
    setSelected(null);
    setConfirming(false);
    setBuyError("");
  }

  // Next tab
  function nextTab() {
    setTabIndex((tabIndex + 1) % TABS.length);
    setSelected(null);
    setConfirming(false);
    setBuyError("");
  }

  return (
    <div className="buy-sell-screen">

      {/* Background image */}
      <img
        className="buy-sell-screen__background"
        src={titleBackgroundImg}
        alt=""
      />

      <div className="buy-sell-screen__panels">

        {/* LEFT PANEL */}
        <div className="buy-sell-screen__panel-wrap">
          <img
            className="buy-sell-screen__panel"
            src={menuPanelImg}
            alt=""
          />

          <div className="buy-sell-screen__panel-content">

            {/* Action buttons */}
            {ACTIONS.map((a) => (
              <button
                key={a}
                className={`button-shell buy-sell-screen__action-btn${
                  action === a
                    ? " buy-sell-screen__action-btn--active"
                    : ""
                }`}
                type="button"
                onClick={() => handleActionBtn(a)}
              >
                <span className="button-shell__inner">{a}</span>
              </button>
            ))}

            {/* Player gold */}
            <div className="buy-sell-screen__gold">
              Gold: {gold}G
            </div>

            {/* Back button */}
            <button
              className="button-shell buy-sell-screen__action-btn"
              type="button"
              onClick={onBack}
            >
              <span className="button-shell__inner">
                Back
              </span>
            </button>

          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="buy-sell-screen__panel-wrap buy-sell-screen__panel-wrap--right">
          <img
            className="buy-sell-screen__panel"
            src={menuPanelImg}
            alt=""
          />

          <div className="buy-sell-screen__panel-content">

            {/* Tab Navigation */}
            <div className="buy-sell-screen__nav">
              ...
            </div>

            {/* Item Display Area */}
            <div className="buy-sell-screen__items-area">

              {/* Confirmation Dialog */}
              {confirming ? (
                ...
              ) : tab === "Land" ? (

                /* Land Grid */
                <div className="buy-sell-screen__grid">
                  ...
                </div>

              ) : (

                /* Building List */
                <div className="buy-sell-screen__building-list">
                  ...
                </div>

              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}