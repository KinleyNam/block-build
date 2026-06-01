import Phaser from "phaser";
import Player from "../objects/Player";
import MultiplayerManager from "../MultiplayerManager";
import { createPlayerAnimations, preloadMarketplaceAssets, createMarketAnimations } from "../assets";
import DialogueBox from "../objects/NpcInteraction";
import DIALOGUES from "../dialouge/marketPlaceDialogue";
import { ensureHud } from "./UIScene";
import gameState from "../gameState";
import EmojiPicker from "../objects/EmojiPicker";

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

  npcAnimatedProp(key, x, groundY, scale = 1, offsetY = 0, depth = 1, dialogueKey = null) {
    const sprite = this.animatedProp(key, x, groundY, scale, offsetY, depth);
    sprite.dialogueKey = dialogueKey ?? key;
    this.npcs.push(sprite);
    return sprite;
  }

  npcFlippedAnimatedProp(key, x, groundY, scale = 1, offsetY = 0, depth = 1, dialogueKey = null) {
    const sprite = this.flippedAnimatedProp(key, x, groundY, scale, offsetY, depth);
    sprite.dialogueKey = dialogueKey ?? key;
    this.npcs.push(sprite);
    return sprite;
  }

  addWalls(distance, elevation, amount) {
    for (let i = 0; i < amount; i++) {
      this.prop("wall", distance * i, elevation, 1.4, 0, 0.5);
    }
  }

  init(data) {
    this.spawnSide = data?.spawnSide || "left";
    this.spawnX    = data?.spawnX    ?? null;
    this.spawnY    = data?.spawnY    ?? null;
  }

  preload() {
    preloadMarketplaceAssets(this);
  }

  create() {
    const height = this.scale.height;
    const camera = this.cameras.main;

    ensureHud(this);

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

    this.npcs = [];
    this.buildShop(groundY);
    this.buildStable(groundY);
    this.buildTownHall(groundY);

    const spawnX = this.spawnX ?? (this.spawnSide === "right" ? WORLD_WIDTH - 200 : 200);
    const spawnY = this.spawnY ?? (groundY - 60);
    this.player = new Player(this, spawnX, spawnY);
    this.player.setFlipX(this.spawnSide !== "right");
    this.player.setDepth(5);
    this.physics.add.collider(this.player, this.groundGroup);
    camera.startFollow(this.player, true);
    this.transitioning = false;

    this.multiplayer = new MultiplayerManager(this, "MarketPlace");
    this.multiplayer.create(this.player);

    this.emojiPicker = new EmojiPicker(this, this.player, "MarketPlace");

    // ── Background music (continues even when marketplace overlay opens) ──────
    if (this.cache.audio.has("marketplace_song")) {
      this.music = this.sound.add("marketplace_song", { loop: true, volume: 0.5 });
      this.music.play();
    }

    const ui = this.scene.get("UIScene");
    ui?.setGold(gameState.gold);
    this._onStateChange = () => this.scene.get("UIScene")?.setGold(gameState.gold);
    gameState.on(this._onStateChange);
    this.events.once("shutdown", () => {
      gameState.off(this._onStateChange);
      if (this.player) gameState.savePosition("MarketPlace", this.player.x, this.player.y);
    });

    this.ePrompt = this.add.image(0, 0, "eKeyPrompt")
      .setScale(1)
      .setDepth(10)
      .setVisible(false);

    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.dialogueBox = new DialogueBox(this);
  }
  buildShop(groundY) {

    this.prop("woodHouse", 500, groundY, 2);

    this.npcAnimatedProp("shopkeeper", 295, groundY, 1.75);
    this.prop("redStall", 300, groundY, 1.8);
    this.prop("stallInv", 270, groundY, 1.6);

    this.prop("bunchOfApples", 232, groundY-24, 1);
    this.prop("bunchOfApples", 252, groundY-24, 1);
    this.prop("bunchOfApples", 273, groundY-24, 1);
    this.prop("bunchOfApples", 293, groundY-24, 1);

    this.npcFlippedAnimatedProp("appleGirl", 170, groundY, 1.75);
    this.npcAnimatedProp("romanYellowGirl", 200, groundY, 1.75, 0, 1, "romanYellowGirl_shop");
    this.npcAnimatedProp("baroness", 380, groundY, 1.75);
    this.npcAnimatedProp("blueLady", 410, groundY, 1.75);

    this.prop("woodHouse", 250, groundY, 1.3, 0, 0.4);
    this.prop("doorSign", 573, groundY-55, 1.8);
    this.prop("apple", 573, groundY-63, 1.8);

    this.npcFlippedAnimatedProp("farmer", 595, groundY, 1.75);
    this.npcFlippedAnimatedProp("plagueDoctor", 640, groundY, 1.75);
    this.npcAnimatedProp("blackMarketDealer", 685, groundY, 1.75);
    this.npcAnimatedProp("miner", 735, groundY, 1.75);
    this.npcAnimatedProp("darkRobedNun", 775, groundY, 1.75);

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
    this.prop("longStoneHouse", 1600, groundY, 1.3, 0 , 0.4);
    this.prop("clothHang", 1150, groundY, 1.55);

  }
  buildTownHall(groundY){
    this.prop("villageTownhall", 2300, groundY, 2);

    this.prop("longStoneHouse", 1940, groundY, 1.925, 0 , 0.8);
    this.npcFlippedAnimatedProp("archerIdle", 1670, groundY, 1.75, 0, 1, "archerLeft");
    this.prop("stoneHouse", 2630, groundY, 1.3 , 0 , 0.4);

    this.prop("vasePurple", 2020, groundY, 1.6);
    this.prop("vasePurple", 2240, groundY, 1.6);
    this.prop("vasePurple", 2463, groundY, 1.6);
    this.prop("vasePurple", 2605, groundY, 1.6);

    this.flippedProp("blueStall", 1840, groundY, 1.8, 0 ,1.5);

    this.npcAnimatedProp("femaleWizard", 1825, groundY, 1.75);
    this.npcAnimatedProp("ladySittingDown", 1875, groundY, 1.75, 0 ,2);
    this.npcAnimatedProp("romanBlueGirl", 1915, groundY, 1.75, 0 ,2);
    this.npcFlippedAnimatedProp("romanYellowGirl", 1970, groundY, 1.75, 0, 2, "romanYellowGirl_town");
    this.npcAnimatedProp("readingGirl", 1940, groundY, 1.75, 0 ,2);
    this.npcAnimatedProp("goddess", 2175, groundY, 1.75, 0 ,2);
    this.npcFlippedAnimatedProp("helmetDog", 2215, groundY, 1.75, 0 ,2);

    this.npcAnimatedProp("femaleKnight", 2290, groundY, 1.75);
    this.npcAnimatedProp("archerIdle", 2625, groundY, 1.75, 0, 1, "archerRight");
    this.npcAnimatedProp("shieldKnight", 2750, groundY, 1.75);
  }


  update(time, delta) {
    this.multiplayer?.update(delta);
    this.multiplayer?.emitMove(this.player, time);

    if (this.dialogueBox?.isOpen) {
      this.player?.body?.setVelocityX(0);
      this.player?.playAnimation("idle");
    } else {
      this.player?.update();
    }

    this.emojiPicker?.update();

    if (this.player && this.npcs?.length) {
      const px = this.player.x;
      const py = this.player.y;
      let nearest = null;
      let nearestDist = Infinity;

      for (const npc of this.npcs) {
        const dx = npc.x - px;
        const dy = npc.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = npc;
        }
      }

      const PROXIMITY = 80;
      const inRange = nearest && nearestDist < PROXIMITY;

      if (inRange && !this.dialogueBox.isOpen) {
        const bob = Math.sin(this.time.now / 250) * 0;
        this.ePrompt.setVisible(true);
        this.ePrompt.setPosition(nearest.x, nearest.y - nearest.displayHeight - 8 + bob);
      } else {
        this.ePrompt.setVisible(false);
      }

      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        if (this.dialogueBox.isOpen) {
          this.dialogueBox.advance();
        } else if (inRange) {
          const data = DIALOGUES[nearest.dialogueKey];
          if (data) {
            const needsChoice = nearest.dialogueKey === "goddess";
            this.dialogueBox.show(data.name, data.lines, needsChoice ? () => {
              window.dispatchEvent(new CustomEvent("show-marketplace-choice"));
            } : undefined);
          }
        }
      }
    }

    if (!this.transitioning && this.player && this.player.x < 150) {
      this.transitioning = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.sound.stopAll();
        this.scene.start("LoadingScene", {
          nextScene: "VillageOutskirtsScene",
          loaderKey: "village",
          spawnSide: "right",
        });
      });
    }

    
  }
}
