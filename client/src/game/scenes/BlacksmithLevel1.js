import Phaser from "phaser";

export default class BlacksmithLevel1 extends Phaser.Scene {
  constructor() {
    super("BlacksmithLevel1");
  }

  preload() {
    // Background layers
    this.load.image("sky", "/assets/sky.png");
    this.load.image("mountains", "/assets/mountains.png");
    this.load.image("forest", "/assets/forest.png");

    // Foreground
    this.load.image("ground", "/assets/ground.png");
    this.load.image("tent", "/assets/tent.png");
    this.load.image("crate", "/assets/crate.png");
    this.load.image("tree", "/assets/tree.png");
  }

  create() {
    // Background
    this.add.image(400, 225, "sky");
    this.add.image(400, 225, "mountains");
    this.add.image(400, 225, "forest");

    // Ground
    const ground = this.physics.add.staticGroup();
    ground.create(400, 430, "ground").setScale(2).refreshBody();

    // Objects
    this.add.image(200, 350, "tent");
    this.add.image(300, 360, "crate");
    this.add.image(600, 350, "tree");

    // Player (placeholder)
    this.player = this.physics.add.sprite(100, 300, null)
      .setSize(32, 48)
      .setCollideWorldBounds(true);

    this.physics.add.collider(this.player, ground);
  }

  update() {
    // Movement later
  }
}