import Phaser from "phaser";
import Player from "../objects/Player";
import MultiplayerManager from "../MultiplayerManager";
import { createPlayerAnimations } from "../assets";
import { ensureHud } from "./UIScene";
import TutorialController from "../objects/TutorialController";
import gameState from "../gameState";
import EmojiPicker from "../objects/EmojiPicker";

const WORLD_WIDTH = 3000;
const CAMERA_ZOOM = 1.5;
const GROUND_TILE_OVERLAP = 1;
const TREE_PATTERN = ["tree", "tree", "tree", "tree", "tree", "brich"];
const BUSH_PATTERN = [
    "smallBush",
    "smallBush",
    "midBush",
    "midBush",
    "midBush",
    "midBush",
    "midBush",
    "bigBush",
];
const DECORATIONS = [
    { x: 250, key: "bigRock" },
    { x: 420, key: "midBush" },
    { x: 900, key: "bigBush" },
    { x: 1200, key: "statue" },
    { x: 1450, key: "mediumRock" },
    { x: 2050, key: "bigBush" },
];

export default class StarterAreaScene extends Phaser.Scene {
    constructor() {
        super("StarterAreaScene");
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
    spawnTreesPattern({
        startX = 0,
        endX = WORLD_WIDTH,
        y,
        spacing = 130,
        scale = 0.85,
    }) {
        for (let x = startX; x < endX; x += spacing) {
            const key = TREE_PATTERN[Math.floor((x - startX) / spacing) % TREE_PATTERN.length];

            const treeImage = this.add.image(x, y, key).setOrigin(0.5, 1);

            if (key === "brich") {
            treeImage.setScale(scale * 2);
            } else {
            treeImage.setScale(scale);
            }
        }
    }

    spawnBushPattern({
        startX = 0,
        endX = WORLD_WIDTH,
        y,
        spacing = 100,
        scale = 0.85,
    }) {
        for (let x = startX; x < endX; x += spacing) {
            const key = BUSH_PATTERN[Math.floor((x - startX) / spacing) % BUSH_PATTERN.length];

            this.add.image(x, y, key)
            .setOrigin(0.5, 1)
            .setScale(scale);
        }
    }

    init(data) {
        this.spawnSide = data?.spawnSide || "left";
        this.spawnX    = data?.spawnX    ?? null;
        this.spawnY    = data?.spawnY    ?? null;
    }

    create() {
        const height = this.scale.height;
        const camera = this.cameras.main;

        ensureHud(this);

        this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
        camera.setBounds(0, 0, WORLD_WIDTH, height);
        camera.setBackgroundColor("#87c9e8");
        camera.setZoom(CAMERA_ZOOM);
        camera.roundPixels = true;
        camera.fadeIn(450, 0, 0, 0);

        this.add.rectangle(0, 0, WORLD_WIDTH, height, 0x87c9e8)
        .setOrigin(0, 0)
        .setScrollFactor(0);

        this.addRepeatedLayer("mountains", height - 220, 1, 0.2);
        this.addRepeatedLayer("farTrees", height - 160, 1, 0.35);
        this.addRepeatedLayer("midTrees", height - 110, 1, 0.5);
        this.addRepeatedLayer("frontTrees", height - 90, 1, 0.7);

        this.groundGroup = this.physics.add.staticGroup();

        const groundHeight = 96;
        const groundY = height - groundHeight;
        const groundTexture = this.textures.get("ground").getSourceImage();
        const groundScale = groundHeight / groundTexture.height;
        const scaledGroundWidth = groundTexture.width * groundScale;
        const groundTileCount = Math.ceil(WORLD_WIDTH / scaledGroundWidth);

        for (let index = 0; index < groundTileCount; index++) {
            const x = index * scaledGroundWidth;
            const groundTile = this.groundGroup.create(x, groundY, "ground").setOrigin(0, 0);
            groundTile.setScale(groundScale);
            groundTile.displayWidth = Math.ceil(scaledGroundWidth) + GROUND_TILE_OVERLAP;
            groundTile.refreshBody();
        }

        DECORATIONS.forEach(({ x, key }) => {
            this.add.image(x, groundY, key).setOrigin(0.5, 1);
        });

        this.spawnTreesPattern({
            startX: 0,
            endX: WORLD_WIDTH,
            y: groundY,
            spacing: 130,
            scale: 0.85,
        });

        this.spawnBushPattern({
            startX: 0,
            endX: WORLD_WIDTH,
            y: groundY,
            spacing: 100,
            scale: 0.85,
        });

            createPlayerAnimations(this);
        const spawnX = this.spawnX ?? (this.spawnSide === "right" ? WORLD_WIDTH - 200 : 150);
        const spawnY = this.spawnY ?? (groundY - 60);
        this.player = new Player(this, spawnX, spawnY);
        this.player.setFlipX(this.spawnSide !== "right");

        this.physics.add.collider(this.player, this.groundGroup);

        camera.startFollow(this.player, true);

        this.transitioning = false;

        this.multiplayer = new MultiplayerManager(this, "StarterAreaScene");
        this.multiplayer.create(this.player);

        this.emojiPicker = new EmojiPicker(this, this.player, "StarterAreaScene");

        this.events.once("shutdown", () => {
            if (this.player) gameState.savePosition("StarterAreaScene", this.player.x, this.player.y);
        });

        const isNewPlayer = gameState.lastScene === null;
        this.tutorial = null;
        if (isNewPlayer) {
            this.tutorial = new TutorialController(this, this.player, groundY);
            this.tutorial.start();
        }
    }

    update(time, delta) {
        this.multiplayer?.update(delta);
        this.multiplayer?.emitMove(this.player, time);

        // Always tick the tutorial (handles goddess exit animation after tutorial ends)
        this.tutorial?.update(time, delta);

        // Only hand input back to the player when the tutorial isn't locking it
        if (!this.tutorial?.inputLocked) {
            this.player?.update();
        }

        this.emojiPicker?.update();

        // Cap player position after player.update() so it overrides player-set velocity
        this.tutorial?.postUpdate();

        if (!this.transitioning && !this.tutorial?.inputLocked && this.player && this.player.x > WORLD_WIDTH - 150) {
            this.transitioning = true;
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.sound.stopAll();
                this.scene.start("LoadingScene", {
                    nextScene: "ComDistrictScene",
                    loaderKey: "commercial",
                    spawnSide: "left",
                });
            });
        }
    }
}
