import { useState } from "react";
import menuPanelImg from "../assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "../assets/UIElement/title-background.png";
import PlaceHolder from "../assets/UIElement/placeholder.png";
import "./BuyAndSell.css";

const TABS = ["Land", "Building"];

const LAND_ITEMS = [
  { id: "A-1-1", label: "A-1", price: "100G" },
  { id: "A-1-2", label: "A-1", price: "100G" },
  { id: "A-1-3", label: "A-1", price: "100G" },
];

const BUILDING_ITEMS = [
  { id: "magic",      label: "Magic Research Facility", price: "250G" },
  { id: "carpentry",  label: "Carpentry Facility",      price: "250G" },
  { id: "blacksmith", label: "Blacksmithing Facility",  price: "250G" },
];

export default function BuyAndSell({ onBack }) {
  const [tabIndex, setTabIndex]     = useState(0);
  const [selected, setSelected]     = useState(null);
  const [confirming, setConfirming] = useState(false);

  const tab = TABS[tabIndex];

  function handleBuy() {
    if (!selected) return;
    setConfirming(true);
  }

  function handleConfirmYes() {
    setConfirming(false);
    setSelected(null);
  }

  function handleConfirmNo() {
    setConfirming(false);
  }

  function prevTab() {
    setTabIndex((tabIndex + TABS.length - 1) % TABS.length);
    setSelected(null);
    setConfirming(false);
  }

  function nextTab() {
    setTabIndex((tabIndex + 1) % TABS.length);
    setSelected(null);
    setConfirming(false);
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
            <button
              className="button-shell buy-sell-screen__action-btn"
              type="button"
              onClick={handleBuy}
            >
              <span className="button-shell__inner">Buy</span>
            </button>

            <button
              className="button-shell buy-sell-screen__action-btn"
              type="button"
            >
              <span className="button-shell__inner">List NFTs</span>
            </button>

            <button
              className="button-shell buy-sell-screen__action-btn"
              type="button"
            >
              <span className="button-shell__inner">Market</span>
            </button>

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

            {/* Tab nav — always rendered, never shifts */}
            <div className="buy-sell-screen__nav">
              <button
                className="buy-sell-screen__arrow"
                type="button"
                aria-label="Previous tab"
                onClick={prevTab}
              >
                <span aria-hidden="true">&#9664;</span>
              </button>
              <div className="button-shell button-shell--small">
                <span className="button-shell__inner">{tab}</span>
              </div>
              <button
                className="buy-sell-screen__arrow"
                type="button"
                aria-label="Next tab"
                onClick={nextTab}
              >
                <span aria-hidden="true">&#9654;</span>
              </button>
            </div>

            {/* Fixed height area — prevents layout shift on tab change */}
            <div className="buy-sell-screen__items-area">

              {confirming ? (
                <div className="buy-sell-screen__confirm">
                  <p className="buy-sell-screen__confirm-text">
                    Are you sure you want to Buy {tab} {selected?.label}?
                  </p>
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
                  {LAND_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      className={`buy-sell-screen__item ${selected?.id === item.id ? "buy-sell-screen__item--selected" : ""}`}
                      type="button"
                      onClick={() => setSelected(item)}
                    >
                      <img
                        className="buy-sell-screen__item-thumb"
                        src={PlaceHolder}
                        alt={item.label}
                      />
                      <span>{item.label}</span>
                      <span>{item.price}</span>
                    </button>
                  ))}
                </div>

              ) : (
                <div className="buy-sell-screen__building-list">
                  {BUILDING_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      className={`buy-sell-screen__building-item ${selected?.id === item.id ? "buy-sell-screen__building-item--selected" : ""}`}
                      type="button"
                      onClick={() => setSelected(item)}
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