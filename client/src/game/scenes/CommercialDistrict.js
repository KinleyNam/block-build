import Phaser from "phaser";
import Player from "../objects/Player";
import { createPlayerAnimations, preloadCommercialAssets } from "../assets";

// Total horizontal size of the level in pixels
const WORLD_WIDTH = 3000;

// Camera zoom level to make pixel art appear larger
const CAMERA_ZOOM = 2;

// Slight overlap between ground tiles to prevent visible gaps
const GROUND_TILE_OVERLAP = 1;

// Decorative repeating patterns for rocks and bushes
const ROCK_PATTERN = ["medium_rocks", "medium_rocks", "small_rocks", "big_rock", "medium_rocks" ]
const BUSH_PATTERN = ["small_bush", "small_bush", "bushes", "big_bush", "bushes"]

const DECORATIONS = [
  {},
  {},
  {},
]

export default class ComDistrictScene extends Phaser.Scene {

  constructor() {
    super("ComDistrictScene");
  }

  preload() {
    // Load all assets required for this scene
    preloadCommercialAssets(this);
  }

  addRepeatedLayer(key, y, scale, scrollFactor){
    const texture = this.textures.get(key).getSourceImage();
    const imageWidth = texture.width * scale;

    // Repeat background images across the full world width
    for(let x = 0; x<WORLD_WIDTH; x += imageWidth){
        this.add.image(x,y,key)
        .setOrigin(0,1)
        .setScale(scale)
        .setScrollFactor(scrollFactor); // creates parallax effect
    }
  }

  spawnBushPattern({
    startX = 0,
    endX = WORLD_WIDTH,
    y,
    spacing = 10,
    scale= 0.5,
  }){
    for (let x = startX; x < endX; x += spacing) {
            // Cycles through bush textures in sequence
            const key = BUSH_PATTERN[Math.floor((x - startX) / spacing) % BUSH_PATTERN.length];

            this.add.image(x, y, key)
            .setOrigin(0.1, 1)
            .setScale(scale);
        }
  }

  spawnRockPattern({
    startX = 0,
    endX = WORLD_WIDTH,
    y,
    spacing = 120,
    scale= 0.55,
  }){
    for (let x = startX; x < endX; x += spacing) {
            // Cycles through rock textures in sequence
            const key = ROCK_PATTERN[Math.floor((x - startX) / spacing) % ROCK_PATTERN.length];

            this.add.image(x, y, key)
            .setOrigin(0.5, 1)
            .setScale(scale);
        }
  }

  spawnHills(height, hills) {
    hills.forEach(({ x, y, scrollFactor }) => {
        this.add.image(x, y, "hill")
            .setOrigin(0, 1)
            .setScale(0.5)
            .setScrollFactor(scrollFactor); // each hill moves differently for depth
    });
  }

 create() {
    const height = this.scale.height;
    const camera = this.cameras.main;

    // Define world and camera movement boundaries
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBounds(0, 0, WORLD_WIDTH, height);

    camera.setBackgroundColor("#87c9e8");
    camera.setZoom(CAMERA_ZOOM);
    camera.roundPixels = true; // sharper pixel-art rendering
    camera.fadeIn(450, 0, 0, 0);

    // Base sky color
    this.add.rectangle(0, 0, WORLD_WIDTH, height, 0x87c9e8)
        .setOrigin(0, 0)
        .setScrollFactor(0);

    // Furthest mountain layer
    this.addRepeatedLayer("grassy_mountains", height - 210-120, 1.0, 0.10);

    // Background hill layer
    this.spawnHills(height, [
        { x: -100, y: height - 216-80, scale: 1.6,  scrollFactor: 0.18 },
        { x: 260,  y: height - 231-80, scale: 1.4,  scrollFactor: 0.18 },
        { x: 560,  y: height - 221-80, scale: 1.7,  scrollFactor: 0.18 },
        { x: 880,  y: height - 226-80, scale: 1.5,  scrollFactor: 0.18 },
        { x: 1150, y: height - 206-80, scale: 1.8,  scrollFactor: 0.18 },
        { x: 1480, y: height - 221-80, scale: 1.55, scrollFactor: 0.18 },
        { x: 1750, y: height - 216-80, scale: 1.65, scrollFactor: 0.18 },
        { x: 2050, y: height - 209-80, scale: 1.7,  scrollFactor: 0.18 },
        { x: 2350, y: height - 223-80, scale: 1.5,  scrollFactor: 0.18 },
        { x: 2620, y: height - 216-80, scale: 1.6,  scrollFactor: 0.18 },
        { x: 2900, y: height - 211-80, scale: 1.45, scrollFactor: 0.18 },
    ]);

    // Cloud layer between hill layers
    this.addRepeatedLayer("clouds_mid", height - 190-60, 1.0, 0.28);

    // Mid-distance hills
    this.spawnHills(height, [
        { x: -80,  y: height - 166-50, scale: 1.5,  scrollFactor: 0.38 },
        { x: 220,  y: height - 186-50, scale: 1.3,  scrollFactor: 0.38 },
        { x: 480,  y: height - 161-50, scale: 1.6,  scrollFactor: 0.38 },
        { x: 780,  y: height - 179-50, scale: 1.4,  scrollFactor: 0.38 },
        { x: 1040, y: height - 169-50, scale: 1.55, scrollFactor: 0.38 },
        { x: 1320, y: height - 173-50, scale: 1.35, scrollFactor: 0.38 },
        { x: 1580, y: height - 159-50, scale: 1.65, scrollFactor: 0.38 },
        { x: 1860, y: height - 176-50, scale: 1.45, scrollFactor: 0.38 },
        { x: 2140, y: height - 166-50, scale: 1.5,  scrollFactor: 0.38 },
        { x: 2420, y: height - 181-50, scale: 1.3,  scrollFactor: 0.38 },
        { x: 2700, y: height - 171-50, scale: 1.4,  scrollFactor: 0.38 },
    ]);

    // Front cloud layer
    this.addRepeatedLayer("clouds_front", height - 180, 1.0, 0.60);

    this.groundGroup = this.physics.add.staticGroup();
    const groundHeight = 96;
    const groundY = height - groundHeight;
    const groundTexture = this.textures.get("ground").getSourceImage();
    const groundScale = groundHeight / groundTexture.height;
    const scaleGroundWidth = groundTexture.width * groundScale;
    const groundTileCount = Math.ceil(WORLD_WIDTH / scaleGroundWidth);

    // Build the ground by repeating tile sprites
    for (let i = 0; i < groundTileCount; i++) {
        const tileX = i * scaleGroundWidth;
        const tile = this.groundGroup.create(tileX, groundY, "ground")
            .setOrigin(0, 0);

        tile.setScale(groundScale);
        tile.displayWidth = Math.ceil(scaleGroundWidth) + GROUND_TILE_OVERLAP;
        tile.refreshBody(); // update physics body after scaling
    }

    // Decorative foreground details
    this.spawnBushPattern({ startX: 0, endX: WORLD_WIDTH, y: groundY+1, spacing: 130, scale: 0.12 });
    this.spawnRockPattern({ startX: 0, endX: WORLD_WIDTH, y: groundY+1, spacing: 100, scale: 0.75 });

    createPlayerAnimations(this);

    // Create player and enable collision with ground
    this.player = new Player(this, 150, groundY - 60);
    this.physics.add.collider(this.player, this.groundGroup);

    // Camera follows the player smoothly
    camera.startFollow(this.player, true);

    this.transitioning = false;
}

  update() {
    this.player?.update();

    // Move back to previous scene if player reaches left edge
    if (!this.transitioning && this.player && this.player.x < 150) {
      this.transitioning = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.sound.stopAll();
        this.scene.start("LoadingScene", {
          nextScene: "StarterAreaScene",
          loaderKey: "world",
        });
      });
    }

    // Move to next scene if player reaches right edge
    if (!this.transitioning && this.player && this.player.x > WORLD_WIDTH - 150) {
      this.transitioning = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.sound.stopAll();
        this.scene.start("LoadingScene", {
          nextScene: "VillageOutskirtsScene",
          loaderKey: "village",
        });
      });
    }
  }
}