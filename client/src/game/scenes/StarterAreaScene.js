import Phaser from "phaser";
import Player from "../objects/Player";
import { createPlayerAnimations } from "../assets";

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

    create() {
        const height = this.scale.height;
        const camera = this.cameras.main;

        this.physics.world.setBounds(0, 0, WORLD_WIDTH, height);
        camera.setBounds(0, 0, WORLD_WIDTH, height);
        camera.setBackgroundColor("#87c9e8");
        camera.setZoom(CAMERA_ZOOM);
        camera.roundPixels = true;

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
        this.player = new Player(this, 150, groundY - 60);

        this.physics.add.collider(this.player, this.groundGroup);

        camera.startFollow(this.player, true);
    }

    update() {
        this.player?.update();
    }
}
