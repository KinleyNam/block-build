import Phaser from "phaser";
import Player from "../objects/Player";
import { createPlayerAnimations, preloadMarketplaceAssets, createMarketAnimations } from "../assets";

const WORLD_WIDTH = 3000;
const CAMERA_ZOOM = 2;
const GROUND_TILE_OVERLAP = 1;

export default class MarketPlace extends Phaser.Scene {
  constructor() {
    super("MarketPlace");
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

  prop(key, x, groundY, scale = 1, offsetY = 0, depth = 1) {
    return this.addCrispImage(x, groundY + offsetY, key, 0.5, 1, scale).setDepth(depth);
  }
  flippedProp(key, x, groundY, scale = 1, offsetY = 0, depth=1) {
    return this.prop(key, x, groundY, scale, offsetY).setFlipX(true).setDepth(depth);
  }
  rotatedProp(key, x, groundY, angle = 0, scale = 1, offsetY = 0, depth = 1) {
    return this.prop(key, x, groundY, scale, offsetY).setRotation(Phaser.Math.DegToRad(angle)).setDepth(depth);
  }

  animatedProp(key, x, groundY, scale = 1, offsetY = 0, depth = 1) {
    const sprite = this.add.sprite(Math.round(x), Math.round(groundY + offsetY), key)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(depth);
    sprite.play(key);
    return sprite;
  }

  addWalls(distance, elevation, amount) {
    for (let i = 0; i < amount; i++) {
      this.prop("wall", distance * i, elevation, 1.4, 0, 0.5);
    }
  }

  preload() {
    preloadMarketplaceAssets(this);
  }

  create() {
    const height = this.scale.height;
    const camera = this.cameras.main;

    createPlayerAnimations(this);
    createMarketAnimations(this);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBounds(0, 0, WORLD_WIDTH, height);
    camera.setBackgroundColor("#8fd0e2");
    camera.setZoom(CAMERA_ZOOM);
    camera.roundPixels = true;
    camera.fadeIn(450, 0, 0, 0);

    this.add.rectangle(0, 0, WORLD_WIDTH, height, 0x8fd0e2)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.addRepeatedLayer("mountains", height - 270, 1, 0.2);
    this.addRepeatedLayer("farTrees", height - 205, 1, 0.34);
    this.addRepeatedLayer("midTrees", height - 150, 1, 0.48);
    this.addRepeatedLayer("frontTrees", height - 100, 1, 0.68);

    const groundY = this.addGround(height);

    this.addWalls(58, groundY, 53);

    this.buildShop(groundY);
    this.buildStable(groundY);
    this.buildTownHall(groundY);

    this.player = new Player(this, 1900, groundY - 60);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, this.groundGroup);
    camera.startFollow(this.player, true);

    
  }
  buildShop(groundY) {

    this.prop("woodHouse", 500, groundY, 2);
    this.prop("redStall", 300, groundY, 1.8);
    this.prop("woodHouse", 250, groundY, 1.3, 0, 0.4);
    this.prop("doorSign", 573, groundY-55, 1.8);
    this.prop("woodHouse", 755, groundY, 1.3, 0, 0.4);
    this.prop("woodHouse", 880, groundY, 1, 0, 0.3);
    this.prop("clothHang", 870, groundY, 1.55);
    this.prop("gate", 987, groundY, 1.13);

  }

  buildStable(groundY){

    this.prop("woodBox", 1100, groundY, 1.8)
    this.prop("woodBox", 1149, groundY, 1.8)
    this.prop("woodBox", 1198, groundY, 1.8)
    this.prop("woodBox", 1246, groundY, 1.8)
    this.prop("woodBox", 1124, groundY-29, 1.8)
    this.prop("woodBox", 1173, groundY-29, 1.8)
    this.prop("woodBox", 1237, groundY-29, 1.8)
    this.prop("woodBox", 1211, groundY-58, 1.8)

    this.prop("barrel", 1300, groundY, 1.8)
    this.prop("barrel", 1325, groundY, 1.8)
    this.prop("barrel", 1350, groundY, 1.8)
    this.prop("barrel", 1375, groundY, 1.8)
    this.prop("barrel", 1400, groundY, 1.8)
    this.prop("barrel", 1425, groundY, 1.8)

    this.prop("barrel", 1313, groundY-32, 1.8)
    this.prop("barrel", 1338, groundY-32, 1.8)
    this.prop("barrel", 1363, groundY-32, 1.8)
    this.prop("barrel", 1388, groundY-32, 1.8)
    this.prop("barrel", 1413, groundY-32, 1.8)

    this.rotatedProp("barrel", 1321, groundY-77, 90, 1.8)
    this.rotatedProp("barrel", 1353, groundY-77, 90, 1.8)
    this.rotatedProp("barrel", 1385, groundY-77, 90, 1.8)

    this.prop("stable", 1255, groundY, 1.65)
    this.prop("clothHang", 1150, groundY, 1.55);

  }
  buildTownHall(groundY){
    this.prop("villageTownhall", 2300, groundY, 2);

    this.prop("longStoneHouse", 1940, groundY, 1.925, 0 , 0.8);
    this.prop("stoneHouse", 2630, groundY, 1.3 , 0 , 0.4);

    this.prop("vasePurple", 2080, groundY, 1.6);
    this.prop("vasePurple", 2100, groundY, 1.6);

    this.flippedProp("blueStall", 1840, groundY, 1.8, 0 ,2);

    this.animatedProp("shopkeeper", 2030, groundY, 1.75);
    this.animatedProp("femaleWizard", 1825, groundY, 1.75);
    this.animatedProp("darkRobedNun", 2180, groundY, 1.75);
    this.animatedProp("farmer", 2460, groundY, 1.75);
    this.animatedProp("readingGirl", 2520, groundY, 1.75);
    this.animatedProp("plagueDoctor", 2580, groundY, 1.75);
    this.animatedProp("appleGirl", 2750, groundY, 1.75);
    this.animatedProp("blackMarketDealer", 2820, groundY, 1.75);
    this.animatedProp("femaleKnight", 2900, groundY, 1.75);
    this.animatedProp("miner", 2960, groundY, 1.75);
  }


  update() {
    this.player?.update();
  }
}
