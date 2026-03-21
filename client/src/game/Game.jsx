import { useEffect, useRef } from "react";
import Phaser from "phaser";
import StarterAreaScene from "./scenes/StarterAreaScene";

export default function Game() {
  const gameRef = useRef(null);
  const phaserGame = useRef(null);

  useEffect(() => {
    if (phaserGame.current) return;

    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      pixelArt: true,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: [StarterAreaScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
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

  return <div ref={gameRef} />;
}