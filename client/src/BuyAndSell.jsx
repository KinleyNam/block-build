import { useState, useEffect, useCallback } from "react";
import menuPanelImg from "./assets/UIElement/main-menu-with-Chains.png";
import titleBackgroundImg from "./assets/UIElement/title-background.png";
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
  buyBuildingOnChain,
  getMyBuildings,
  getBuildingListings,
  listBuildingOnChain,
  cancelBuildingListingOnChain,
  buyListedBuildingOnChain,
  BUILDING_BUY_PRICE,
} from "./game/contractService";
import { BUILDING_TYPES } from "./game/gameState";
import { isConnected } from "./game/wallet";
import { LAND_IMAGE_URL } from "./game/contractConfig";

// Building marketplace placeholder images
import bg_blacksmith1 from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl1.png";
import bg_blacksmith2 from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl2.png";
import bg_blacksmith3 from "./assets/work Buildings/ImagePlaceHolder/Background_Blacksmithlvl3.png";
import bg_carpentry1  from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl1.png";
import bg_carpentry2  from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl2.png";
import bg_carpentry3  from "./assets/work Buildings/ImagePlaceHolder/Background_Carpentrylvl3.png";
import bg_magic1      from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl1.png";
import bg_magic2      from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl2.png";
import bg_magic3      from "./assets/work Buildings/ImagePlaceHolder/Background_MagicResearchlvl3.png";

const BUILDING_IMGS = [
  [bg_blacksmith1, bg_blacksmith2, bg_blacksmith3],
  [bg_carpentry1,  bg_carpentry2,  bg_carpentry3],
  [bg_magic1,      bg_magic2,      bg_magic3],
];

function buildingImg(buildingType, level) {
  return BUILDING_IMGS[buildingType]?.[level - 1] ?? null;
}

const ACTIONS = ["Buy", "List NFT", "Market"];
const CATEGORIES = ["Land", "Building"];

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

  // Category navigation (Land / Building)
  const [catIdx, setCatIdx] = useState(0);
  const category = CATEGORIES[catIdx];

  // Building state
  const [myBuildings,     setMyBuildings]     = useState([]);
  const [bldgMarketList,  setBldgMarketList]  = useState([]);
  const [bldgBuySelected, setBldgBuySelected] = useState(null); // BUILDING_TYPES entry
  const [bldgBuyConfirm,  setBldgBuyConfirm]  = useState(false);
  const [bldgBuyError,    setBldgBuyError]    = useState("");
  const [bldgBuyPending,  setBldgBuyPending]  = useState(false);

  const [bldgListSelected, setBldgListSelected] = useState(null); // building object
  const [bldgListPrice,    setBldgListPrice]    = useState("");
  const [bldgListStep,     setBldgListStep]     = useState("select");
  const [bldgListError,    setBldgListError]    = useState("");
  const [bldgListPending,  setBldgListPending]  = useState(false);

  const [bldgCancelId,      setBldgCancelId]      = useState(null);
  const [bldgCancelPending, setBldgCancelPending] = useState(false);
  const [bldgCancelError,   setBldgCancelError]   = useState("");

  const [bldgMktSelected, setBldgMktSelected] = useState(null);
  const [bldgMktConfirm,  setBldgMktConfirm]  = useState(false);
  const [bldgMktError,    setBldgMktError]    = useState("");
  const [bldgMktPending,  setBldgMktPending]  = useState(false);

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

  const refreshBuildings = useCallback(async () => {
    if (!isConnected()) return;
    setChainLoading(true);
    try {
      const [buildings, listings] = await Promise.all([
        getMyBuildings(myAddress),
        getBuildingListings(),
      ]);
      gameState.setMyBuildings(buildings);
      setMyBuildings(buildings);
      setBldgMarketList(listings);
    } catch (e) {
      console.warn("Building chain read failed:", e);
    } finally {
      setChainLoading(false);
    }
  }, [myAddress]);

  useEffect(() => {
    if (category === "Building") refreshBuildings();
  }, [action, category, refreshBuildings]);

  // Helpers
  const ownerOf    = (parcel) => owners[parcel.id] || null;
  const isMyParcel = (parcel) => ownerOf(parcel) === myAddress;
  const listingOf  = (parcel) => marketList.find(l => l.tokenId === parcel.tokenId);

  function switchAction(a) {
    setAction(a);
    setCatIdx(0);
    // reset land flow state
    setBuySelected(null); setBuyConfirm(false); setBuyError("");
    setListParcel(null);  setListPrice("");     setListStep("select"); setListError("");
    setCancelId(null);    setCancelError("");
    setMktSelected(null); setMktConfirm(false); setMktError("");
    // reset building flow state
    setBldgBuySelected(null); setBldgBuyConfirm(false); setBldgBuyError("");
    setBldgListSelected(null); setBldgListPrice(""); setBldgListStep("select"); setBldgListError("");
    setBldgCancelId(null); setBldgCancelError("");
    setBldgMktSelected(null); setBldgMktConfirm(false); setBldgMktError("");
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
    if (category === "Building") {
      switch (action) {
        case "Buy":      return renderBuildingBuy();
        case "List NFT": return renderBuildingListNFT();
        case "Market":   return renderBuildingMarket();
        default:         return null;
      }
    }
    switch (action) {
      case "Buy":      return renderBuy();
      case "List NFT": return renderListNFT();
      case "Market":   return renderMarket();
      default:         return null;
    }
  }

  // ── Building: Buy (primary sale, level 1 only) ────────────────────────────

  async function handleBldgBuyConfirm() {
    if (!isConnected()) { setBldgBuyError("Connect your wallet first."); return; }
    setBldgBuyPending(true); setBldgBuyError("");
    try {
      await buyBuildingOnChain(bldgBuySelected.id);
      const [buildings, balance] = await Promise.all([
        getMyBuildings(myAddress),
        getGoldBalance(myAddress),
      ]);
      gameState.setMyBuildings(buildings);
      setMyBuildings(buildings);
      gameState.gold = balance;
      gameState._emit();
      setBldgBuyConfirm(false); setBldgBuySelected(null);
    } catch (e) {
      setBldgBuyError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setBldgBuyPending(false);
    }
  }

  function renderBuildingBuy() {
    if (bldgBuyConfirm) {
      return (
        <div className="buy-sell-screen__confirm">
          <img
            className="buy-sell-screen__item-thumb"
            src={buildingImg(bldgBuySelected.id, 1)}
            alt={bldgBuySelected.name}
            style={{ width: 90, height: 90, objectFit: "contain", marginBottom: 8 }}
          />
          <p className="buy-sell-screen__confirm-text">
            {bldgBuyPending
              ? "Waiting for transaction…"
              : `Buy ${bldgBuySelected.name} (Lv.1) for ${BUILDING_BUY_PRICE}G?`}
          </p>
          {bldgBuyError && <p className="buy-sell-screen__confirm-error">{bldgBuyError}</p>}
          {!bldgBuyPending && (
            <div className="buy-sell-screen__confirm-buttons">
              <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleBldgBuyConfirm}>
                <span className="button-shell__inner">Yes</span>
              </button>
              <button className="button-shell buy-sell-screen__confirm-no"
                onClick={() => { setBldgBuyConfirm(false); setBldgBuySelected(null); setBldgBuyError(""); }}>
                <span className="button-shell__inner">No</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="buy-sell-screen__grid">
        {BUILDING_TYPES.map(type => (
          <button
            key={type.id}
            className="buy-sell-screen__item"
            onClick={() => { setBldgBuySelected(type); setBldgBuyConfirm(true); }}
          >
            <img
              className="buy-sell-screen__item-thumb"
              src={buildingImg(type.id, 1)}
              alt={type.name}
            />
            <span>{type.name}</span>
            <span>Lv.1 — {BUILDING_BUY_PRICE}G</span>
          </button>
        ))}
      </div>
    );
  }

  // ── Building: List NFT ────────────────────────────────────────────────────

  async function handleBldgListConfirm() {
    if (!isConnected()) { setBldgListError("Connect your wallet first."); return; }
    const price = Number(bldgListPrice);
    if (!price || price <= 0) { setBldgListError("Enter a valid price greater than 0."); return; }
    setBldgListPending(true); setBldgListError("");
    try {
      await listBuildingOnChain(bldgListSelected.tokenId, price);
      await refreshBuildings();
      setBldgListStep("select"); setBldgListSelected(null); setBldgListPrice("");
    } catch (e) {
      setBldgListError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setBldgListPending(false);
    }
  }

  async function handleBldgCancelConfirm() {
    if (!isConnected()) return;
    setBldgCancelPending(true); setBldgCancelError("");
    try {
      await cancelBuildingListingOnChain(bldgCancelId);
      await refreshBuildings();
      setBldgCancelId(null);
    } catch (e) {
      setBldgCancelError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setBldgCancelPending(false);
    }
  }

  function renderBuildingListNFT() {
    // Only unplaced buildings can be listed
    const listable = myBuildings.filter(b => !b.placed);

    if (bldgCancelId !== null) {
      const b = myBuildings.find(b => b.tokenId === bldgCancelId);
      return (
        <div className="buy-sell-screen__confirm">
          <p className="buy-sell-screen__confirm-text">
            {bldgCancelPending
              ? "Cancelling listing…"
              : `Remove listing for ${BUILDING_TYPES[b?.buildingType]?.name} Lv.${b?.level}?`}
          </p>
          {bldgCancelError && <p className="buy-sell-screen__confirm-error">{bldgCancelError}</p>}
          {!bldgCancelPending && (
            <div className="buy-sell-screen__confirm-buttons">
              <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleBldgCancelConfirm}>
                <span className="button-shell__inner">Yes</span>
              </button>
              <button className="button-shell buy-sell-screen__confirm-no"
                onClick={() => { setBldgCancelId(null); setBldgCancelError(""); }}>
                <span className="button-shell__inner">No</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    if (bldgListSelected && bldgListStep === "price") {
      return (
        <div className="buy-sell-screen__confirm">
          <p className="buy-sell-screen__confirm-text">
            List {BUILDING_TYPES[bldgListSelected.buildingType]?.name} Lv.{bldgListSelected.level} for how much GOLD?
          </p>
          <input
            className="buy-sell-screen__price-input"
            type="number" min="1"
            value={bldgListPrice}
            onChange={e => setBldgListPrice(e.target.value)}
            placeholder="e.g. 200"
          />
          {bldgListError && <p className="buy-sell-screen__confirm-error">{bldgListError}</p>}
          {bldgListPending
            ? <p className="buy-sell-screen__confirm-text">Waiting for transaction…</p>
            : (
              <div className="buy-sell-screen__confirm-buttons">
                <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleBldgListConfirm}>
                  <span className="button-shell__inner">List</span>
                </button>
                <button className="button-shell buy-sell-screen__confirm-no"
                  onClick={() => { setBldgListStep("select"); setBldgListSelected(null); setBldgListPrice(""); setBldgListError(""); }}>
                  <span className="button-shell__inner">Cancel</span>
                </button>
              </div>
            )}
        </div>
      );
    }

    if (listable.length === 0) {
      return <p className="buy-sell-screen__status">No unplaced buildings to list.<br/>Remove a building from your land first.</p>;
    }

    return (
      <div className="buy-sell-screen__grid">
        {listable.map(b => {
          const inMarket = bldgMarketList.some(l => l.tokenId === b.tokenId && l.seller === myAddress);
          return (
            <div key={b.tokenId} className="buy-sell-screen__item buy-sell-screen__item--mine">
              <img className="buy-sell-screen__item-thumb" src={buildingImg(b.buildingType, b.level)} alt="" />
              <span>{BUILDING_TYPES[b.buildingType]?.name}</span>
              <span>Lv.{b.level}</span>
              {inMarket
                ? <>
                    <span className="buy-sell-screen__item-owned-label">Listed</span>
                    <button className="buy-sell-screen__mini-btn" onClick={() => setBldgCancelId(b.tokenId)}>
                      Delist
                    </button>
                  </>
                : <button className="buy-sell-screen__mini-btn"
                    onClick={() => { setBldgListSelected(b); setBldgListStep("price"); }}>
                    List
                  </button>}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Building: Market (P2P) ────────────────────────────────────────────────

  async function handleBldgMktConfirm() {
    if (!isConnected()) { setBldgMktError("Connect your wallet first."); return; }
    setBldgMktPending(true); setBldgMktError("");
    try {
      await buyListedBuildingOnChain(bldgMktSelected.tokenId, bldgMktSelected.price);
      const [buildings, balance] = await Promise.all([
        getMyBuildings(myAddress),
        getGoldBalance(myAddress),
      ]);
      gameState.setMyBuildings(buildings);
      setMyBuildings(buildings);
      gameState.gold = balance;
      gameState._emit();
      await refreshBuildings();
      setBldgMktConfirm(false); setBldgMktSelected(null);
    } catch (e) {
      setBldgMktError(e?.reason || e?.message || "Transaction failed.");
    } finally {
      setBldgMktPending(false);
    }
  }

  function renderBuildingMarket() {
    const available = bldgMarketList.filter(l => l.seller !== myAddress);

    if (bldgMktConfirm) {
      const typeName = BUILDING_TYPES[bldgMktSelected.buildingType]?.name;
      return (
        <div className="buy-sell-screen__confirm">
          <p className="buy-sell-screen__confirm-text">
            {bldgMktPending
              ? "Waiting for transaction…"
              : `Buy ${typeName} Lv.${bldgMktSelected.level} for ${bldgMktSelected.price}G from ${shortAddr(bldgMktSelected.seller)}?`}
          </p>
          {bldgMktError && <p className="buy-sell-screen__confirm-error">{bldgMktError}</p>}
          {!bldgMktPending && (
            <div className="buy-sell-screen__confirm-buttons">
              <button className="button-shell buy-sell-screen__confirm-yes" onClick={handleBldgMktConfirm}>
                <span className="button-shell__inner">Yes</span>
              </button>
              <button className="button-shell buy-sell-screen__confirm-no"
                onClick={() => { setBldgMktConfirm(false); setBldgMktSelected(null); setBldgMktError(""); }}>
                <span className="button-shell__inner">No</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    if (available.length === 0) {
      return <p className="buy-sell-screen__status">No building listings right now.</p>;
    }

    return (
      <div className="buy-sell-screen__grid">
        {available.map(listing => (
          <button
            key={listing.tokenId}
            className="buy-sell-screen__item"
            onClick={() => { setBldgMktSelected(listing); setBldgMktConfirm(true); }}
          >
            <img className="buy-sell-screen__item-thumb" src={buildingImg(listing.buildingType, listing.level)} alt="" />
            <span>{BUILDING_TYPES[listing.buildingType]?.name}</span>
            <span>Lv.{listing.level} — {listing.price}G</span>
            <span className="buy-sell-screen__item-owned-label">{shortAddr(listing.seller)}</span>
          </button>
        ))}
      </div>
    );
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

  return (
    <div className="buy-sell-screen">
      <img className="buy-sell-screen__background" src={titleBackgroundImg} alt="" />

      <div className="buy-sell-screen__gold-hud">
        <span className="buy-sell-screen__gold-icon">G</span>
        <span className="buy-sell-screen__gold-amount">{gold}</span>
      </div>

      <div className="buy-sell-screen__panels">

        {/* Left panel — action buttons */}
        <div className="buy-sell-screen__panel-wrap">
          <img className="buy-sell-screen__panel" src={menuPanelImg} alt="" />
          <div className="buy-sell-screen__panel-content">
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
            <div className="buy-sell-screen__bar">
              <button
                className="buy-sell-screen__arrow"
                onClick={() => setCatIdx(i => Math.max(0, i - 1))}
                disabled={catIdx === 0}
              >◄</button>
              <span className="buy-sell-screen__bar-label">{category}</span>
              <button
                className="buy-sell-screen__arrow"
                onClick={() => setCatIdx(i => Math.min(CATEGORIES.length - 1, i + 1))}
                disabled={catIdx === CATEGORIES.length - 1}
              >►</button>
            </div>
            <div className="buy-sell-screen__items-area">
              {renderContent()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
