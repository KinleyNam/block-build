import Phaser from "phaser";
import Player from "../objects/Player";
import { createPlayerAnimations, preloadMagicInteriorAssets, preloadWorldAssets } from "../assets";

const WORLD_WIDTH = 1080;
const CAMERA_ZOOM = 1;
const GROUND_TILE_OVERLAP = 1;
const ROOM_BASE_HEIGHT = 300;

const WALL_DECORATIONS = [
  { x: 240, key: "MagicLogo", scale: 0.18, yFactor: 0.35 },
];

const SUNLIGHT_POSITIONS = [320];
const SUPPORT_BEAMS = [580];

const FURNITURE = [
  { x: 200,  key: "Table",         scale: 0.22, yOffset: 0  },
  { x: 155,  key: "ChemistBottle", scale: 0.14, yOffset: 18 },
  { x: 205,  key: "Lamp",          scale: 0.14, yOffset: 18 },
  { x: 110,  key: "Chair",         scale: 0.20, yOffset: 0  },
  { x: 270,  key: "Books",         scale: 0.13, yOffset: 0  },
  { x: 300,  key: "LyingBooks",    scale: 0.12, yOffset: 0  },
  { x: 750,  key: "Chair",         scale: 0.20, yOffset: 0  },
  { x: 810,  key: "Books",         scale: 0.13, yOffset: 0  },
];

export default class MaResAreaScene extends Phaser.Scene {
  constructor() {
    super("MaResAreaScene");
  }

  preload() {
    preloadWorldAssets(this);
    preloadMagicInteriorAssets(this);
  }

  addRepeatedLayer(key, y, scale, scrollFactor) {
    const texture = this.textures.get(key).getSourceImage();
    const imageWidth = texture.width * scale;
    for (let x = 0; x < WORLD_WIDTH; x += imageWidth) {
      this.add.image(x, y, key)
        .setOrigin(0, 1)
        .setScale(scale)
        .setScrollFactor(scrollFactor);
    }
  }

  create() {
    const height = this.scale.height;
    const camera = this.cameras.main;

    // Derive scale factor from canvas height vs designed room height
    const HEIGHT_SCALE = (height / ROOM_BASE_HEIGHT);

    this.physics.world.gravity.y = 300;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setZoom(CAMERA_ZOOM);
    camera.roundPixels = true;

    // ── Ground (first so groundY is available below) ─────────────────────
    this.groundGroup = this.physics.add.staticGroup();
    const groundHeight = 96;
    const groundY = height - groundHeight;
    const groundTexture = this.textures.get("ground").getSourceImage();
    const groundScale = groundHeight / groundTexture.height;
    const scaledGroundWidth = groundTexture.width * groundScale;
    const groundTileCount = Math.ceil(WORLD_WIDTH / scaledGroundWidth);

    for (let i = 0; i < groundTileCount; i++) {
      const tileX = i * scaledGroundWidth;
      const tileWidth = Math.ceil(scaledGroundWidth) + GROUND_TILE_OVERLAP;
      const tile = this.groundGroup.create(tileX, groundY, "ground")
        .setOrigin(0, 0)
        .setImmovable(true);
      tile.setDisplaySize(tileWidth, groundHeight);
      tile.body.setSize(tileWidth, groundHeight);
      tile.body.reset(tileX, groundY);
      tile.refreshBody();
    }

    // ── Interior — stretches to fill full width, stops at groundY ────────
    this.add.image(0, 0, "Interior")
      .setOrigin(0, 0)
      .setDisplaySize(WORLD_WIDTH, groundY)
      .setDepth(-1);

    // ── Support beams ────────────────────────────────────────────────────
    SUPPORT_BEAMS.forEach(x => {
      this.add.image(x, groundY, "SupportBeam")
        .setOrigin(0.5, 1)
        .setScale(0.25 * HEIGHT_SCALE)
        .setDepth(1);
    });

    // ── Sunlight ─────────────────────────────────────────────────────────
    SUNLIGHT_POSITIONS.forEach(x => {
      this.add.image(x, height * 0.72, "Sunlight")
        .setOrigin(0.5, 1)
        .setScale(0.22 * HEIGHT_SCALE)
        .setAlpha(0.6)
        .setDepth(1);
    });

    // ── Wall decorations ─────────────────────────────────────────────────
    WALL_DECORATIONS.forEach(({ x, key, scale, yFactor }) => {
      this.add.image(x, height * yFactor, key)
        .setOrigin(0.5, 0.5)
        .setScale(scale * HEIGHT_SCALE)
        .setDepth(2);
    });

    // ── Furniture ────────────────────────────────────────────────────────
    FURNITURE.forEach(({ x, key, scale, yOffset }) => {
      this.add.image(x, groundY - yOffset, key)
        .setOrigin(0.5, 1)
        .setScale(scale * HEIGHT_SCALE)
        .setDepth(yOffset > 0 ? 4 : 3);
    });

    // ── Player ───────────────────────────────────────────────────────────
    createPlayerAnimations(this);
    this.player = new Player(this, 150, groundY - 60);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.groundGroup);
    camera.startFollow(this.player, true, 0.1, 0);
    camera.scrollY = 0;
  }

  update() {
    this.player?.update();
  }
}