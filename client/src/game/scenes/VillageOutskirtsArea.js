import Phaser from "phaser";
import Player from "../objects/Player";
import { createPlayerAnimations } from "../assets";
import { createVillageAnimations } from "../assets";

const WORLD_WIDTH = 3000;
const CAMERA_ZOOM = 2;
const GROUND_TILE_OVERLAP = 1;
const BUILDING_SCALE = 1;
const LARGE_BUILDING_SCALE = 1;
const CAMP_BOTTLE_SCALE = 1.5;

const CLOUDS = [
  { key: "cloud1", x: 20, y: 24, scale: 0.9, scrollFactor: 0.04, drift: 0.011 },
  { key: "cloud2", x: 650, y: 44, scale: 0.95, scrollFactor: 0.06, drift: 0.015 },
  { key: "cloud1", x: 1210, y: 18, scale: 0.82, scrollFactor: 0.05, drift: 0.012 },
  { key: "cloud2", x: 1720, y: 42, scale: 0.92, scrollFactor: 0.06, drift: 0.014 },
  { key: "cloud1", x: 2380, y: 20, scale: 0.88, scrollFactor: 0.05, drift: 0.013 },
];

const APPLE_TREES = [
  { x: 150, scale: 0.88 },
  { x: 560, scale: 0.92 },
  { x: 1010, scale: 0.9 },
  { x: 1490, scale: 0.94 },
  { x: 2140, scale: 0.9 },
  { x: 2810, scale: 0.92 },
];

const PINE_TREES = [
  { x: 1900, scale: 0.72 },
  { x: 2075, scale: 0.78 },
  { x: 2260, scale: 0.82 },
  { x: 2440, scale: 0.84 },
  { x: 2620, scale: 0.8 },
  { x: 2795, scale: 0.76 },
];

export default class VillageOutskirtsScene extends Phaser.Scene {
  constructor() {
    super("VillageOutskirtsScene");
  }

  addCrispImage(x, y, key, originX, originY, scale = 1, scrollFactor = 1) {
    const image = this.add.image(Math.round(x), Math.round(y), key)
      .setOrigin(originX, originY)
      .setScrollFactor(scrollFactor);
    const texture = this.textures.get(key).getSourceImage();

    image.setDisplaySize(
      Math.round(texture.width * scale),
      Math.round(texture.height * scale),
    );

    return image;
  }

  addRepeatedLayer(key, y, scale, scrollFactor) {
    const texture = this.textures.get(key).getSourceImage();
    const imageWidth = Math.round(texture.width * scale);

    for (let x = 0; x < WORLD_WIDTH; x += imageWidth) {
      this.addCrispImage(x, y, key, 0, 1, scale, scrollFactor);
    }
  }

  addGround(height) {
    this.groundGroup = this.physics.add.staticGroup();

    const groundHeight = 96;
    const groundY = height - groundHeight;
    const groundTexture = this.textures.get("ground").getSourceImage();
    const groundScale = groundHeight / groundTexture.height;
    const scaledGroundWidth = groundTexture.width * groundScale;
    const tileCount = Math.ceil(WORLD_WIDTH / scaledGroundWidth);

    for (let index = 0; index < tileCount; index++) {
      const x = index * scaledGroundWidth;
      const groundTile = this.groundGroup.create(x, groundY, "ground")
        .setOrigin(0, 0);
      groundTile.setScale(groundScale);
      groundTile.displayWidth = Math.ceil(scaledGroundWidth) + GROUND_TILE_OVERLAP;
      groundTile.refreshBody();
    }

    return groundY;
  }

  prop(key, x, groundY, scale = 1, offsetY = 0, depth= 1) {
    return this.addCrispImage(x, groundY + offsetY, key, 0.5, 1, scale).setDepth(depth);
  }

  flippedProp(key, x, groundY, scale = 1, offsetY = 0, depth=1) {
    return this.prop(key, x, groundY, scale, offsetY).setFlipX(true).setDepth(depth);
  }

  animatedProp(key, x, groundY, scale = 1, offsetY = 0, depth=1) {
    const sprite = this.add.sprite(
      Math.round(x),
      Math.round(groundY + offsetY),
      key
    )
    .setOrigin(0.5, 1)
    .setScale(scale)
    .setDepth(depth);

    sprite.play(key);

    return sprite;
  }
  flippedAnimatedProp(key, x, groundY, scale = 1, offsetY = 0, depth=1) {
    const sprite = this.add.sprite(
      Math.round(x),
      Math.round(groundY + offsetY),
      key
    )
    .setOrigin(0.5, 1)
    .setScale(scale)
    .setDepth(depth)
    .setFlipX(1);

    sprite.play(key);

    return sprite;
  }

  preload() {
    this.load.audio("ciaccona", "/ciaccona.mp3");
  }

  create() {
    const height = this.scale.height;
    const camera = this.cameras.main;

    createPlayerAnimations(this);
    createVillageAnimations(this);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBackgroundColor("#8fd0e2");
    camera.setZoom(CAMERA_ZOOM);
    camera.roundPixels = true;
    camera.fadeIn(450, 0, 0, 0);

    this.sound.play("ciaccona", { loop: true, volume: 0.6 });

    this.add.rectangle(0, 0, WORLD_WIDTH, height, 0x8fd0e2)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.clouds = CLOUDS.map((cloud) => ({
      drift: cloud.drift,
      image: this.addCrispImage(
        cloud.x,
        cloud.y,
        cloud.key,
        0,
        0,
        cloud.scale,
        cloud.scrollFactor,
      ),
    }));

    this.addRepeatedLayer("mountains", height - 270, 1, 0.2);
    this.addRepeatedLayer("farTrees", height - 205, 1, 0.34);
    this.addRepeatedLayer("midTrees", height - 150, 1, 0.48);
    this.addRepeatedLayer("frontTrees", height - 100, 1, 0.68);

    const groundY = this.addGround(height);

    for (let x = 30; x < WORLD_WIDTH; x += 76) {
      this.prop("grass", x, groundY, 0.78 + ((x / 76) % 3) * 0.08);
    }

    this.prop("signPost", 58, groundY, 0.95);

    APPLE_TREES.forEach(({ x }) => {
      this.prop("appleTree", x, groundY, 1.45);
    });

    PINE_TREES.forEach(({ x }) => {
      this.prop("tallTree", x, groundY, 0.5);
    });

    this.buildCamp(groundY);
    this.buildTavernArea(groundY);
    this.buildStableArea(groundY);

    

    this.player = new Player(this, 100, groundY - 60);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, this.groundGroup);
    camera.startFollow(this.player, true);

    
  }

  buildCamp(groundY) {
    this.prop("tent", 250, groundY, BUILDING_SCALE * 2.6);
    this.flippedProp("tent", 655, groundY, LARGE_BUILDING_SCALE * 2.6);
    this.prop("table", 140, groundY, 2);
    this.prop("woodBox", 220, groundY, 1.8);
    this.prop("basketApple", 140, groundY-38, 1.6);
    this.prop("apples", 220, groundY-29, 1.3);
    this.prop("stool", 338, groundY, 1.6);

    this.animatedProp("sittingKnight", 375, groundY, 1.75);
    this.animatedProp("cookingPot", 455, groundY, CAMP_BOTTLE_SCALE);

    this.prop("stool", 405, groundY, 1.6);
    this.flippedAnimatedProp("ladyChef", 415, groundY, 1.75);
    this.flippedAnimatedProp("sittingKnight", 515, groundY, 1.75);

    this.prop("bunchBottles", 300, groundY, CAMP_BOTTLE_SCALE);

    this.animatedProp("archerIdle", 300, groundY, 1.75);

    this.prop("barrel", 658, groundY, 1.8);

    this.animatedProp("beerMan", 590, groundY, 1.75);
    this.animatedProp("blueLady", 630, groundY, 1.75);
  }

  buildTavernArea(groundY) {
    this.prop("tavern", 1180, groundY, LARGE_BUILDING_SCALE*1.9);
    
    this.prop("pot", 1058, groundY-36, 1.8);
    this.prop("basketApple", 1088, groundY-36, 1.6);
    this.prop("threeBottles", 1115, groundY-36, CAMP_BOTTLE_SCALE);
    this.prop("table", 850, groundY, 2);
    this.prop("threeBottles", 850, groundY-38, CAMP_BOTTLE_SCALE);

    this.animatedProp("dancingCouple", 830, groundY, 1.75);
    this.animatedProp("femaleSittingCross", 900, groundY, 1.75);
    this.animatedProp("guitaristKnight", 940, groundY, 1.75);
    this.animatedProp("fluteGuy", 990, groundY, 1.75);
    this.animatedProp("gutaristGuy", 1045, groundY, 1.75);
    this.animatedProp("lyingFemale", 1110, groundY-17, 1.75);
    

    this.flippedAnimatedProp("pubWaiter", 1250, groundY, 1.75);
    this.animatedProp("pubWaitress", 1170, groundY, 1.75);

    this.prop("chair", 1455, groundY, 1.8);
    this.prop("oneBottle", 1510, groundY-38, CAMP_BOTTLE_SCALE);
    this.prop("table", 1510, groundY, 2);
    this.prop("basketBread", 1405, groundY-17, 1.6);
    this.prop("barrel", 1330, groundY, 1.8);
    this.prop("barrel", 1310, groundY, 1.8);
    this.prop("basketBread", 1280, groundY, 1.6);

    this.animatedProp("sittingKnight", 1460, groundY, 1.75);
    this.animatedProp("fatKnightBeer", 1550, groundY, 1.75);

  }

  buildStableArea(groundY) {
    this.prop("wall", 2060, groundY, 1.5);
    this.prop("wall", 2140, groundY, 1.5);
    this.prop("horse", 2080, groundY, 0.65);
    this.flippedProp("blackHorse", 2260, groundY, 0.58);
    this.prop("stable", 2180, groundY, LARGE_BUILDING_SCALE * 1.5);
    this.prop("table", 1980, groundY, 2);
    this.prop("woodBox", 2330, groundY, 1.8);
    this.prop("woodBox", 2300, groundY, 1.8);
    this.prop("woodBox", 2315, groundY-29, 1.8);
    this.prop("barrel", 2055, groundY, 1.8);
    this.prop("barrel", 2030, groundY, 1.8);

    this.animatedProp("romanYellowGirl", 2090, groundY, 1.75);
    this.animatedProp("spanishInquisition", 2180, groundY, 1.75);
    this.animatedProp("romanBlueGirl", 2210, groundY, 1.75);

    this.prop("signPost", 2800, groundY, 0.9);
    this.prop("mediumRock", 2448, groundY, 0.92);
    this.prop("bigRock", 2420, groundY, 1.2);
    this.prop("twoWalls", 2975, groundY, 0.9);

    this.flippedAnimatedProp("baldKnight", 2830, groundY, 2);
    this.animatedProp("shieldKnight", 2900, groundY, 1.75);
    this.animatedProp("shieldKnight", 2920, groundY, 1.75);

    this.prop("wall", 2988, groundY, 1.4, 0, 10);
  }

  update() {
    this.player?.update();

    this.clouds?.forEach(({ image, drift }) => {
      image.x += drift;
      if (image.x > WORLD_WIDTH + 220) {
        image.x = -image.displayWidth - 40;
      }
    });
    if (!this.transitioning && this.player && this.player.x > WORLD_WIDTH - 150) {
      this.transitioning = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("LoadingScene", {
          nextScene: "MarketPlace",
          loaderKey: "Nocstella",
        });
      });
    }
    if (!this.transitioning && this.player && this.player.x < 70) {
      this.transitioning = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("LoadingScene", {
          nextScene: "MarketPlace",
          loaderKey: "Nocstella",
        });
      });
    }
  }
}
