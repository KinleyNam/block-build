import { useEffect, useRef } from "react";
import Phaser from "phaser";

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.add.text(250, 120, "Block Build", {
      fontSize: "32px",
      color: "#ffffff",
    });

    this.add.rectangle(400, 420, 300, 40, 0x4caf50);
    this.add.text(310, 408, "Start", {
      fontSize: "20px",
      color: "#000000",
    });
  }
}

function Game() {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);

  useEffect(() => {
    if (phaserGameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      backgroundColor: "#2d2d2d",
      scene: [MainScene],
    };

    phaserGameRef.current = new Phaser.Game(config);

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  return <div ref={gameRef} />;
}

export default Game;