import Phaser from "phaser";

import sky from "../../assets/backgrounds/sky.png";
import mountains from "../../assets/backgrounds/mountains.png";
import farTrees from "../../assets/backgrounds/far-trees.png";
import midTrees from "../../assets/backgrounds/mid-trees.png";
import frontTrees from "../../assets/backgrounds/Front-trees.png";
import castle from "../../assets/backgrounds/Castle.png";

import ground from "../../assets/platforms/ground.png";

import statue from "../../assets/props/statue.png";

import bigRock from "../../assets/props/big-rock.png";
import mediumRock from "../../assets/props/medium-rock.png";

import bigBush from "../../assets/props/big-bush.png";
import midBush from "../../assets/props/mid-bush.png";
import smallBush from "../../assets/props/small-bush.png";

import tree from "../../assets/props/tree.png";
import brich from "../../assets/props/Birch1.png";

export default class StarterAreaScene extends Phaser.Scene {
    constructor() {
        super("StarterAreaScene");
    }
    addRepeatedLayer(key, y, scale, scrollFactor) {
        const worldWidth = 3000;
        const texture = this.textures.get(key).getSourceImage();
        const imageWidth = texture.width * scale;

        for (let x = 0; x < worldWidth; x += imageWidth) {
            this.add.image(x, y, key)
            .setOrigin(0, 1)
            .setScale(scale)
            .setScrollFactor(scrollFactor);
        }
    }
    spawnTreesPattern({
        startX = 0,
        endX = 3000,
        y,
        spacing = 130,
        scale = 0.85,
    }) {
        // 1 birch for every 5 normal trees
        const pattern = ["tree", "tree", "tree", "tree", "tree", "brich"];

        let index = 0;

        for (let x = startX; x < endX; x += spacing) {
            const key = pattern[index % pattern.length];

            const treeImage = this.add.image(x, y, key).setOrigin(0.5, 1);

            if (key === "brich") {
            treeImage.setScale(scale * 2);
            } else {
            treeImage.setScale(scale);
            }

            index++;
        }
    }

    spawnBushPattern({
        startX = 0,
        endX = 3000,
        y,
        spacing = 100,
        scale = 0.85,
    }) {
        // ratio 2 : 5 : 1
        const pattern = [
            "smallBush",
            "smallBush",
            "midBush",
            "midBush",
            "midBush",
            "midBush",
            "midBush",
            "bigBush",
        ];

        let index = 0;

        for (let x = startX; x < endX; x += spacing) {
            const key = pattern[index % pattern.length];

            this.add.image(x, y, key)
            .setOrigin(0.5, 1)
            .setScale(scale);

            index++;
        }
    }

    preload() {
        this.load.image("sky", sky);
        this.load.image("mountains", mountains);
        this.load.image("farTrees", farTrees);
        this.load.image("midTrees", midTrees);
        this.load.image("frontTrees", frontTrees);
        this.load.image("castle", castle);

        this.load.image("ground", ground);

        this.load.image("statue", statue);

        this.load.image("bigRock", bigRock);
        this.load.image("mediumRock", mediumRock)
        ;
        this.load.image("bigBush", bigBush);
        this.load.image("midBush", midBush);
        this.load.image("smallBush", smallBush);

        this.load.image("tree", tree);
        this.load.image("brich", brich);
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const worldWidth = 3000;

        this.physics.world.setBounds(0, 0, worldWidth, height);
        this.cameras.main.setBounds(0, 0, worldWidth, height);
        this.cameras.main.setBackgroundColor("#87c9e8");

        // -------------------------
        // BACKGROUND
        // -------------------------

        // sky background
        this.add.rectangle(0, 0, worldWidth, height, 0x87c9e8)
        .setOrigin(0, 0)
        .setScrollFactor(0);

        this.addRepeatedLayer("mountains", height - 220, 1, 0.2);
        this.addRepeatedLayer("farTrees", height - 160, 1, 0.35);
        this.addRepeatedLayer("midTrees", height - 110, 1, 0.5);
        this.addRepeatedLayer("frontTrees", height - 90, 1, 0.7);

        // -------------------------
        // GROUND
        // -------------------------

        this.groundGroup = this.physics.add.staticGroup();

        const groundHeight = 96;
        const groundY = height - groundHeight;

        // Get original asset width
        const groundTexture = this.textures.get("ground").getSourceImage();
        const originalGroundWidth = groundTexture.width;
        const originalGroundHeight = groundTexture.height;

        // scale ground to desired height
        const groundScale = groundHeight / originalGroundHeight;
        const scaledGroundWidth = originalGroundWidth * groundScale;

        for (let x = 0; x < worldWidth; x += scaledGroundWidth) {
            const groundTile = this.groundGroup.create(x, groundY, "ground").setOrigin(0, 0);
            groundTile.setScale(groundScale);
            groundTile.refreshBody();
        }

        // -------------------------
        // DECORATIONS
        // -------------------------

        this.add.image(250, groundY, "bigRock").setOrigin(0.5, 1);
        this.add.image(420, groundY, "midBush").setOrigin(0.5, 1);
        this.spawnTreesPattern({
            startX: 0,
            endX: 3000,
            y: groundY,
            spacing: 130,
            scale: 0.85,
        });

        this.spawnBushPattern({
            startX: 0,
            endX: 3000,
            y: groundY,
            spacing: 100,
            scale: 0.85,
        });
        

        this.add.image(900, groundY, "bigBush").setOrigin(0.5, 1);
        this.add.image(1200, groundY, "statue").setOrigin(0.5, 1);
        this.add.image(1450, groundY, "mediumRock").setOrigin(0.5, 1);
        
        this.add.image(2050, groundY, "bigBush").setOrigin(0.5, 1);

        // -------------------------
        // PLAYER
        // -------------------------

        this.player = this.add.rectangle(150, groundY - 60, 32, 48, 0xff0000);
        this.physics.add.existing(this.player);

        this.player.body.setCollideWorldBounds(true);
        this.player.body.setGravityY(800);

        this.physics.add.collider(this.player, this.groundGroup);

        // camera follow
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // controls
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        const speed = 220;
        const body = this.player.body;

        if (this.cursors.left.isDown) {
            body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(speed);
        } else {
            body.setVelocityX(0);
        }

        if (this.cursors.up.isDown && body.blocked.down) {
            body.setVelocityY(-450);
        }
    }
}