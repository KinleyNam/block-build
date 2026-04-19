import Phaser from "phaser";
import BlacksmithLevel1 from "./scenes/BlacksmithLevel1";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 500 },
      debug: true
    }
  },
  scene: [BlacksmithLevel1]
};

export default config;