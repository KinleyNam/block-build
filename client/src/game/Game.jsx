import { useEffect, useRef } from "react";
import Phaser from "phaser";
import LoadingScene from "./scenes/LoadingScene";
import StarterAreaScene from "./scenes/StarterAreaScene";
import VillageOutskirtsScene from "./scenes/VillageOutskirtsArea";
import MarketPlace from "./scenes/MarketPlace";
import ComDistrictScene from "./scenes/CommercialDistrict";
import UIScene from "./scenes/UIScene";

const gameContainerStyle = { width: "100%", height: "100%" };

export default function Game() {
  const gameRef = useRef(null);
  const phaserGame = useRef(null);

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

  return <div ref={gameRef} style={gameContainerStyle} />;
}
