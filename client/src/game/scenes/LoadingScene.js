import Phaser from "phaser";
import { preloadWorldAssets, preloadVillageAssets } from "../assets";

// Map of loaderKey → asset loader function
const LOADERS = {
  world:   preloadWorldAssets,
  village: preloadVillageAssets,
};

// Map of loaderKey → flavour text shown during loading
const LOADER_TEXT = {
  world:   { title: "BLOCK BUILD",        subtitle: "Preparing the world..."        },
  village: { title: "VILLAGE OUTSKIRTS",  subtitle: "Entering the village..."       },
};

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super("LoadingScene");
  }

  /** Receives data passed by scene.start("LoadingScene", data) */
  init(data) {
    this.nextScene = data?.nextScene || "StarterAreaScene";
    this.loaderKey = data?.loaderKey || "world";
  }

  preload() {
    const { width, height } = this.scale;
    const barWidth  = Math.min(420, width * 0.7);
    const barHeight = 20;
    const barX      = (width - barWidth) / 2;
    const barY      = height * 0.58;

    this.cameras.main.setBackgroundColor("#120f0b");

    const flavour = LOADER_TEXT[this.loaderKey] ?? LOADER_TEXT.world;

    this.add
      .text(width / 2, height * 0.38, flavour.title, {
        fontFamily: "Georgia",
        fontSize:   "34px",
        color:      "#efe2b7",
        fontStyle:  "bold",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(width / 2, height * 0.48, flavour.subtitle, {
        fontFamily: "Verdana",
        fontSize:   "18px",
        color:      "#d8c99a",
      })
      .setOrigin(0.5);

    const percentText = this.add
      .text(width / 2, barY + 36, "0%", {
        fontFamily: "Verdana",
        fontSize:   "16px",
        color:      "#f5efdc",
      })
      .setOrigin(0.5);

    // Progress bar frame
    const frame = this.add.graphics();
    frame.lineStyle(3, 0xa68a52, 1);
    frame.strokeRoundedRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6, 10);

    // Progress bar fill
    const progressBar = this.add.graphics();

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xe0bc63, 1);
      progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 8);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on("fileprogress", (file) => {
      const label = file.key.replace(/([A-Z])/g, " $1").trim();
      statusText.setText(`Loading ${label}...`);
    });

    this.load.once("complete", () => {
      statusText.setText("Ready!");
      this.time.delayedCall(150, () => {
        this.scene.start(this.nextScene);
      });
    });

    // Run the appropriate asset loader
    const loader = LOADERS[this.loaderKey] ?? preloadWorldAssets;
    loader(this);
  }
}
