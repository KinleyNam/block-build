import Phaser from "phaser";
import Player from "../objects/Player";
import {createPlayerAnimations, preloadWorldAssets} from "../assets";


const WORLD_WIDTH = 3000;
const CAMERA_ZOOM = 1;
const GROUND_TILE_OVERLAP = 1;
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
    preloadWorldAssets(this);
  }

  addRepeatedLayer(key, y, scale, scrollFactor){
    const texture = this.textures.get(key).getSourceImage();
    const imageWidth = texture.width * scale;

    for(let x = 0; x<WORLD_WIDTH; x += imageWidth){
        this.add.image(x,y,key)
        .setOrigin(0,1)
        .setScale(scale)
        .setScrollFactor(scrollFactor);
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
            .setScrollFactor(scrollFactor);
    });
}


 create() {
    const height = this.scale.height;
    const camera = this.cameras.main;

    this.physics.world.gravity.y = 300;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBackgroundColor("#87c9e8");
    camera.setZoom(CAMERA_ZOOM);
    camera.roundPixels = true;

    // Sky
    this.add.rectangle(0, 0, WORLD_WIDTH, height, 0x87c9e8)
        .setOrigin(0, 0)
        .setScrollFactor(0);

    // 1. Distant mountains — furthest back, slowest scroll
    this.addRepeatedLayer("grassy_mountains", height - 130, 1.0, 0.10);

    // 2. Far hills — dark, behind clouds
    this.spawnHills(height, [
        { x: -100, y: height - 136, scale: 1.6,  scrollFactor: 0.18 },
        { x: 260,  y: height - 151, scale: 1.4,  scrollFactor: 0.18 },
        { x: 560,  y: height - 141, scale: 1.7,  scrollFactor: 0.18 },
        { x: 880,  y: height - 146, scale: 1.5,  scrollFactor: 0.18 },
        { x: 1150, y: height - 126, scale: 1.8,  scrollFactor: 0.18 },
        { x: 1480, y: height - 141, scale: 1.55, scrollFactor: 0.18 },
        { x: 1750, y: height - 136, scale: 1.65, scrollFactor: 0.18 },
        { x: 2050, y: height - 129, scale: 1.7,  scrollFactor: 0.18 },
        { x: 2350, y: height - 143, scale: 1.5,  scrollFactor: 0.18 },
        { x: 2620, y: height - 136, scale: 1.6,  scrollFactor: 0.18 },
        { x: 2900, y: height - 131, scale: 1.45, scrollFactor: 0.18 },
    ]);

    // 3. Clouds sitting between the hill layers
    this.addRepeatedLayer("clouds_mid", height - 110, 1.0, 0.28);

    // 4. Mid hills — lighter, in front of clouds
    this.spawnHills(height, [
        { x: -80,  y: height - 86, scale: 1.5,  scrollFactor: 0.38 },
        { x: 220,  y: height - 106, scale: 1.3,  scrollFactor: 0.38 },
        { x: 480,  y: height - 81, scale: 1.6,  scrollFactor: 0.38 },
        { x: 780,  y: height - 99, scale: 1.4,  scrollFactor: 0.38 },
        { x: 1040, y: height - 89, scale: 1.55, scrollFactor: 0.38 },
        { x: 1320, y: height - 93, scale: 1.35, scrollFactor: 0.38 },
        { x: 1580, y: height - 79,  scale: 1.65, scrollFactor: 0.38 },
        { x: 1860, y: height - 96, scale: 1.45, scrollFactor: 0.38 },
        { x: 2140, y: height - 86, scale: 1.5,  scrollFactor: 0.38 },
        { x: 2420, y: height - 101, scale: 1.3,  scrollFactor: 0.38 },
        { x: 2700, y: height - 91, scale: 1.4,  scrollFactor: 0.38 },
    ]);

    // 5. Front clouds
    this.addRepeatedLayer("clouds_front", height - 95, 1.0, 0.60);

    // Ground
    this.groundGroup = this.physics.add.staticGroup();
    const groundHeight = 96;
    const groundY = height - groundHeight;
    const groundTexture = this.textures.get("ground").getSourceImage();
    const groundScale = groundHeight / groundTexture.height;
    const scaleGroundWidth = groundTexture.width * groundScale;
    const groundTileCount = Math.ceil(WORLD_WIDTH / scaleGroundWidth);

    for (let i = 0; i < groundTileCount; i++) {
        const tileX = i * scaleGroundWidth;
        const tileWidth = Math.ceil(scaleGroundWidth) + GROUND_TILE_OVERLAP;
        const tile = this.groundGroup.create(tileX, groundY, "ground")
            .setOrigin(0, 0)
            .setImmovable(true);
        tile.setDisplaySize(tileWidth, groundHeight);
        tile.body.setSize(tileWidth, groundHeight);
        tile.body.reset(tileX, groundY);
        tile.refreshBody();
    }

    // Bushes and rocks on ground
    this.spawnBushPattern({ startX: 0, endX: WORLD_WIDTH, y: groundY, spacing: 130, scale: 0.12 });
    this.spawnRockPattern({ startX: 0, endX: WORLD_WIDTH, y: groundY, spacing: 100, scale: 0.75 });

    createPlayerAnimations(this);
    this.player = new Player(this, 150, groundY - 60);
    this.physics.add.collider(this.player, this.groundGroup);
    camera.startFollow(this.player, true, 0.1, 0);
    camera.scrollY = 0;
}

  update() {
    this.player?.update()

    // if (this.player.x > 2800 && !this.transitioning) {
    //   this.transitioning = true;
    //   this.scene.start('MaResAreaScene');
    // }
  }
}