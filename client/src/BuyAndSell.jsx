import { useState, useEffect, useCallback } from "react";
import menuPanelImg from "./assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "./assets/UIElement/title-background.png";
import PlaceHolder from "./assets/UIElement/land-Image.png";
import "./BuyAndSell.css";
import gameState, { LAND_PARCELS } from "./game/gameState";
import {
  buyLandOnChain,
  getGoldBalance,
  getAllLandOwners,
  listLandOnChain,
  cancelListingOnChain,
  buyListedLandOnChain,
  getListings,
} from "./game/contractService";
import { isConnected } from "./game/wallet";
import { LAND_IMAGE_URL } from "./game/contractConfig";

const ACTIONS = ["Buy", "List NFT", "Market", "My NFTs"];

function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function BuyAndSell({ onBack }) {
  const [action,       setAction]       = useState("Buy");
  const [gold,         setGold]         = useState(gameState.gold);
  const [owners,       setOwners]       = useState({ ...gameState.landOwnership });
  const [marketList,   setMarketList]   = useState([]);
  const [chainLoading, setChainLoading] = useState(false);

  // Buy (primary sale) state
  const [buySelected, setBuySelected] = useState(null);
  const [buyConfirm,  setBuyConfirm]  = useState(false);
  const [buyError,    setBuyError]    = useState("");
  const [buyPending,  setBuyPending]  = useState(false);

  // List NFT state
  const [listParcel,  setListParcel]  = useState(null);
  const [listPrice,   setListPrice]   = useState("");
  const [listStep,    setListStep]    = useState("select"); // "select" | "price"
  const [listError,   setListError]   = useState("");
  const [listPending, setListPending] = useState(false);

  // Cancel listing state
  const [cancelId,      setCancelId]      = useState(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError,   setCancelError]   = useState("");

  // Market (P2P buy) state
  const [mktSelected, setMktSelected] = useState(null);
  const [mktConfirm,  setMktConfirm]  = useState(false);
  const [mktError,    setMktError]    = useState("");
  const [mktPending,  setMktPending]  = useState(false);

  // Sync gold + ownership from gameState pub-sub
  useEffect(() => {
    const sync = () => {
      setOwners({ ...gameState.landOwnership });
      setGold(gameState.gold);
    };
    gameState.on(sync);
    return () => gameState.off(sync);
  }, []);

  // Refresh chain state whenever action tab changes
  const refreshChain = useCallback(async () => {
    if (!isConnected()) return;
    setChainLoading(true);
    try {
      const [chainOwners, chainListings] = await Promise.all([
        getAllLandOwners(),
        getListings(),
      ]);
      gameState.setLandOwnership(chainOwners);
      setMarketList(chainListings);
    } catch (e) {
      console.warn("Chain read failed:", e);
    } finally {
      setChainLoading(false);
    }
  }, []);

  useEffect(() => { refreshChain(); }, [action, refreshChain]);

  const myAddress = gameState.walletAddress.toLowerCase();

  // Helpers
  const ownerOf    = (parcel) => owners[parcel.id] || null;
  const isMyParcel = (parcel) => ownerOf(parcel) === myAddress;
  const listingOf  = (parcel) => marketList.find(l => l.tokenId === parcel.tokenId);

  function switchAction(a) {
    setAction(a);
    // reset all flow state
    setBuySelected(null); setBuyConfirm(false); setBuyError("");
    setListParcel(null);  setListPrice("");     setListStep("select"); setListError("");
    setCancelId(null);    setCancelError("");
    setMktSelected(null); setMktConfirm(false); setMktError("");
  }

  // ── Buy (primary sale) ────────────────────────────────────────────────────

  async function handleBuyConfirm() {
    if (!isConnected()) { setBuyError("Connect your wallet first."); return; }
    setBuyPending(true); setBuyError("");
    try {
      await buyLandOnChain(buySelected.tokenId);
      const [newOwners, balance] = await Promise.all([
        getAllLandOwners(),
        getGoldBalance(myAddress),
      ]);
      gameState.setLandOwnership(newOwners);
      gameState.gold = balance;
      gameState._emit();
      setBuyConfirm(false); setBuySelected(null);
    } catch (err) {
      setBuyError(err?.reason || err?.message || "Transaction failed.");
    } finally {
      setBuyPending(false);
    }
  }

  // ── List NFT ──────────────────────────────────────────────────────────────

  async function handleListConfirm() {
    if (!isConnected()) { setListError("Connect your wallet first."); return; }
    const price = Number(listPrice);
    if (!price || price <= 0) { setListError("Enter a valid price greater than 0."); return; }
    setListPending(true); setListError("");
    try {
      await listLandOnChain(listParcel.tokenId, price);
      await refreshChain();
      setListStep("select"); setListParcel(null); setListPrice("");
    } catch (err) {
      setListError(err?.reason || err?.message || "Transaction failed.");
    } finally {
      setListPending(false);
    }
  }

  // ── Cancel listing ────────────────────────────────────────────────────────

  async function handleCancelConfirm() {
    if (!isConnected()) return;
    setCancelPending(true); setCancelError("");
    try {
      await cancelListingOnChain(cancelId);
      await refreshChain();
      setCancelId(null);
    } catch (err) {
      setCancelError(err?.reason || err?.message || "Transaction failed.");
    } finally {
      setCancelPending(false);
    }
  }

  // ── Market (P2P buy) ──────────────────────────────────────────────────────

  async function handleMktConfirm() {
    if (!isConnected()) { setMktError("Connect your wallet first."); return; }
    setMktPending(true); setMktError("");
    try {
      await buyListedLandOnChain(mktSelected.tokenId, mktSelected.price);
      const [newOwners, balance] = await Promise.all([
        getAllLandOwners(),
        getGoldBalance(myAddress),
      ]);
      gameState.setLandOwnership(newOwners);
      gameState.gold = balance;
      gameState._emit();
      await refreshChain();
      setMktConfirm(false); setMktSelected(null);
    } catch (err) {
      setMktError(err?.reason || err?.message || "Transaction failed.");
    } finally {
      setMktPending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderContent() {
    if (chainLoading) {
      return <p className="buy-sell-screen__status">Loading from chain…</p>;
    }
    switch (action) {
      case "Buy":     return renderBuy();
      case "List NFT": return renderListNFT();
      case "Market":  return renderMarket();
      case "My NFTs": return renderMyNFTs();
      default:        return null;
    }
  }

  function renderBuy() {
    if (buyConfirm) {
      return (
        <div className="buy-sell-screen__confirm">
          <p className="buy-sell-screen__confirm-text">
            {buyPending
              ? "Waiting for transaction…"
              : `Buy Land ${buySelected.label} for ${buySelected.price}G?`}
          </p>
          {buyError && <p className="buy-sell-screen__confirm-error">{buyError}</p>}
          {!buyPending && (
            <div className="buy-sell-screen__confirm-buttons">
              <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleBuyConfirm}>
                <span className="button-shell__inner">Yes</span>
              </button>
              <button className="button-shell buy-sell-screen__confirm-no"
                onClick={() => { setBuyConfirm(false); setBuySelected(null); setBuyError(""); }}>
                <span className="button-shell__inner">No</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="buy-sell-screen__grid">
        {LAND_PARCELS.map(parcel => {
          const owner = ownerOf(parcel);
          const mine  = isMyParcel(parcel);
          return (
            <button
              key={parcel.id}
              className={`buy-sell-screen__item${owner ? " buy-sell-screen__item--owned" : ""}`}
              disabled={!!owner}
              onClick={() => { setBuySelected(parcel); setBuyConfirm(true); }}
            >
              <img className="buy-sell-screen__item-thumb" src={LAND_IMAGE_URL} alt={parcel.label} />
              <span>{parcel.label}</span>
              {owner
                ? <span className="buy-sell-screen__item-owned-label">
                    {mine ? "Yours" : shortAddr(owner)}
                  </span>
                : <span>{parcel.price}G</span>}
            </button>
          );
        })}
      </div>
    );
  }

  function renderListNFT() {
    const myParcels = LAND_PARCELS.filter(p => isMyParcel(p));

    if (myParcels.length === 0) {
      return <p className="buy-sell-screen__status">You don't own any land yet.</p>;
    }

    // Cancel confirm dialog
    if (cancelId !== null) {
      const parcel  = LAND_PARCELS.find(p => p.tokenId === cancelId);
      const listing = listingOf(parcel);
      return (
        <div className="buy-sell-screen__confirm">
          <p className="buy-sell-screen__confirm-text">
            {cancelPending
              ? "Cancelling listing…"
              : `Remove listing for ${parcel?.label} (${listing?.price}G)?`}
          </p>
          {cancelError && <p className="buy-sell-screen__confirm-error">{cancelError}</p>}
          {!cancelPending && (
            <div className="buy-sell-screen__confirm-buttons">
              <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleCancelConfirm}>
                <span className="button-shell__inner">Yes</span>
              </button>
              <button className="button-shell buy-sell-screen__confirm-no"
                onClick={() => { setCancelId(null); setCancelError(""); }}>
                <span className="button-shell__inner">No</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    // Price input step
    if (listParcel && listStep === "price") {
      return (
        <div className="buy-sell-screen__confirm">
          <p className="buy-sell-screen__confirm-text">
            List Land {listParcel.label} for how much GOLD?
          </p>
          <input
            className="buy-sell-screen__price-input"
            type="number"
            min="1"
            value={listPrice}
            onChange={e => setListPrice(e.target.value)}
            placeholder="e.g. 150"
          />
          {listError && <p className="buy-sell-screen__confirm-error">{listError}</p>}
          {listPending
            ? <p className="buy-sell-screen__confirm-text">Waiting for transaction…</p>
            : (
              <div className="buy-sell-screen__confirm-buttons">
                <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleListConfirm}>
                  <span className="button-shell__inner">List</span>
                </button>
                <button className="button-shell buy-sell-screen__confirm-no"
                  onClick={() => { setListStep("select"); setListParcel(null); setListPrice(""); setListError(""); }}>
                  <span className="button-shell__inner">Cancel</span>
                </button>
              </div>
            )}
        </div>
      );
    }

    // Parcel grid
    return (
      <div className="buy-sell-screen__grid">
        {myParcels.map(parcel => {
          const listing = listingOf(parcel);
          return (
            <div key={parcel.id} className="buy-sell-screen__item buy-sell-screen__item--mine">
              <img className="buy-sell-screen__item-thumb" src={LAND_IMAGE_URL} alt={parcel.label} />
              <span>{parcel.label}</span>
              {listing
                ? <>
                    <span className="buy-sell-screen__item-owned-label">Listed: {listing.price}G</span>
                    <button className="buy-sell-screen__mini-btn" onClick={() => setCancelId(parcel.tokenId)}>
                      Delist
                    </button>
                  </>
                : <button className="buy-sell-screen__mini-btn"
                    onClick={() => { setListParcel(parcel); setListStep("price"); }}>
                    List
                  </button>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderMarket() {
    const available = marketList.filter(l => l.seller !== myAddress);

    if (available.length === 0) {
      return <p className="buy-sell-screen__status">No land listings right now.</p>;
    }

    if (mktConfirm) {
      const parcel = LAND_PARCELS.find(p => p.tokenId === mktSelected.tokenId);
      return (
        <div className="buy-sell-screen__confirm">
          <p className="buy-sell-screen__confirm-text">
            {mktPending
              ? "Waiting for transaction…"
              : `Buy Land ${parcel?.label} for ${mktSelected.price}G from ${shortAddr(mktSelected.seller)}?`}
          </p>
          {mktError && <p className="buy-sell-screen__confirm-error">{mktError}</p>}
          {!mktPending && (
            <div className="buy-sell-screen__confirm-buttons">
              <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleMktConfirm}>
                <span className="button-shell__inner">Yes</span>
              </button>
              <button className="button-shell buy-sell-screen__confirm-no"
                onClick={() => { setMktConfirm(false); setMktSelected(null); setMktError(""); }}>
                <span className="button-shell__inner">No</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="buy-sell-screen__grid">
        {available.map(listing => {
          const parcel = LAND_PARCELS.find(p => p.tokenId === listing.tokenId);
          return (
            <button
              key={listing.tokenId}
              className="buy-sell-screen__item"
              onClick={() => { setMktSelected(listing); setMktConfirm(true); }}
            >
              <img className="buy-sell-screen__item-thumb" src={LAND_IMAGE_URL} alt={parcel?.label} />
              <span>{parcel?.label}</span>
              <span>{listing.price}G</span>
              <span className="buy-sell-screen__item-owned-label">{shortAddr(listing.seller)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderMyNFTs() {
    const myParcels = LAND_PARCELS.filter(p => isMyParcel(p));

    if (myParcels.length === 0) {
      return <p className="buy-sell-screen__status">You don't own any land NFTs yet.</p>;
    }

    return (
      <div className="buy-sell-screen__grid">
        {myParcels.map(parcel => {
          const listing = listingOf(parcel);
          return (
            <div key={parcel.id} className="buy-sell-screen__item buy-sell-screen__item--mine">
              <img className="buy-sell-screen__item-thumb" src={LAND_IMAGE_URL} alt={parcel.label} />
              <span>{parcel.label}</span>
              <span className="buy-sell-screen__item-owned-label">
                {listing ? `Listed: ${listing.price}G` : "Owned"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="buy-sell-screen">
      <img className="buy-sell-screen__background" src={titleBackgroundImg} alt="" />

      <div className="buy-sell-screen__panels">

        {/* Left panel — action buttons */}
        <div className="buy-sell-screen__panel-wrap">
          <img className="buy-sell-screen__panel" src={menuPanelImg} alt="" />
          <div className="buy-sell-screen__panel-content">
            <p className="buy-sell-screen__gold">{gold}G</p>
            {ACTIONS.map(a => (
              <button
                key={a}
                className={`button-shell buy-sell-screen__action-btn${action === a ? " buy-sell-screen__action-btn--active" : ""}`}
                onClick={() => switchAction(a)}
              >
                <span className="button-shell__inner">{a}</span>
              </button>
            ))}
            <button className="button-shell buy-sell-screen__action-btn" onClick={onBack}>
              <span className="button-shell__inner">Back</span>
            </button>
          </div>
        </div>

        {/* Right panel — content */}
        <div className="buy-sell-screen__panel-wrap buy-sell-screen__panel-wrap--right">
          <img className="buy-sell-screen__panel" src={menuPanelImg} alt="" />
          <div className="buy-sell-screen__panel-content">
            <p className="buy-sell-screen__section-title">{action}</p>
            <div className="buy-sell-screen__items-area">
              {renderContent()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
