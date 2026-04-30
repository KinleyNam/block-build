import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import EscapeMenu from "../EscapeMenu";
import MarketplaceChoice from "../MarketplaceChoice";
import BuyAndSell from "../BuyAndSell";
import LoadingScene from "./scenes/LoadingScene";
import StarterAreaScene from "./scenes/StarterAreaScene";
import VillageOutskirtsScene from "./scenes/VillageOutskirtsArea";
import MarketPlace from "./scenes/MarketPlace";
import ComDistrictScene from "./scenes/CommercialDistrict";
import UIScene from "./scenes/UIScene";

const gameContainerStyle = { width: "100%", height: "100%" };

function lockGame(open) {
  window.dispatchEvent(new CustomEvent("escape-menu", { detail: { open } }));
}

export default function Game() {
  const gameRef    = useRef(null);
  const phaserGame = useRef(null);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [choiceOpen,     setChoiceOpen]     = useState(false);
  const [buyAndSellOpen, setBuyAndSellOpen] = useState(false);

  // ESC key toggles the escape menu (only when no other overlay is open)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Escape") return;
      if (choiceOpen || buyAndSellOpen) return;
      setMenuOpen(prev => {
        const next = !prev;
        lockGame(next);
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choiceOpen, buyAndSellOpen]);

  // Listen for the goddess / village chief dialogue ending
  useEffect(() => {
    const handler = () => {
      setChoiceOpen(true);
      lockGame(true);
    };
    window.addEventListener("show-marketplace-choice", handler);
    return () => window.removeEventListener("show-marketplace-choice", handler);
  }, []);

  const handleMenuClose = () => {
    setMenuOpen(false);
    lockGame(false);
  };

  const handleChoiceMarketplace = () => {
    setChoiceOpen(false);
    setBuyAndSellOpen(true);
    // game input stays locked while BuyAndSell is open
  };

  const handleChoiceCancel = () => {
    setChoiceOpen(false);
    lockGame(false);
  };

  const handleBuyAndSellClose = () => {
    setBuyAndSellOpen(false);
    lockGame(false);
  };

  useEffect(() => {
    if (phaserGame.current || !gameRef.current) return undefined;

    const config = {
      type: Phaser.AUTO,
      width: gameRef.current.clientWidth || window.innerWidth,
      height: gameRef.current.clientHeight || window.innerHeight,
      parent: gameRef.current,
      pixelArt: true,
      antialias: false,
      antialiasGL: false,
      render: {
        roundPixels: true,
      },
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: [LoadingScene, StarterAreaScene, VillageOutskirtsScene, MarketPlace, ComDistrictScene, UIScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: "100%",
        height: "100%",
      },
    };

    phaserGame.current = new Phaser.Game(config);

    return () => {
      if (phaserGame.current) {
        phaserGame.current.destroy(true);
        phaserGame.current = null;
      }
    };
  }, []);

  return (
    <>
      <div ref={gameRef} style={gameContainerStyle} />
      {menuOpen       && <EscapeMenu onClose={handleMenuClose} />}
      {choiceOpen     && (
        <MarketplaceChoice
          onMarketplace={handleChoiceMarketplace}
          onCancel={handleChoiceCancel}
        />
      )}
      {buyAndSellOpen && <BuyAndSell onBack={handleBuyAndSellClose} />}
    </>
  );
}
