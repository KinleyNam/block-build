import { useEffect, useRef } from "react";
import Phaser from "phaser";
import ComDistrictScene from "./scenes/ComDistrictScene";

const gameContainerStyle = { width: "100%", height: "100%" };

export default function Game() {
  const gameRef = useRef(null);
  const phaserGame = useRef(null);

  useEffect(() => {
    if (phaserGame.current || !gameRef.current) return undefined;

   const config = {
  type: Phaser.AUTO,
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
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: [ComDistrictScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: gameRef.current.clientWidth || window.innerWidth,
    height: gameRef.current.clientHeight || window.innerHeight,
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