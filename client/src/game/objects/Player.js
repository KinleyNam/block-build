import Phaser from "phaser";

const WALK_SPEED = 180;
const RUN_SPEED = 350;
const JUMP_VELOCITY = -325;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "playerIdle");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setGravityY(800);
    this.setScale(1.75);
    this.setFlipX(true);
    this.setDepth(5);

    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.shiftKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );
  }

  playAnimation(key) {
    if (this.anims.currentAnim?.key !== key) {
      this.anims.play(key, true);
    }
  }

  update() {
    const isRunning = this.shiftKey.isDown;
    const speed = isRunning ? RUN_SPEED : WALK_SPEED;
    const body = this.body;

    if (this.keys.left.isDown) {
      body.setVelocityX(-speed);
      this.setFlipX(false);
    } else if (this.keys.right.isDown) {
      body.setVelocityX(speed);
      this.setFlipX(true);
    } else {
      body.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.up) && body.blocked.down) {
      body.setVelocityY(JUMP_VELOCITY);
    }

    if (!body.blocked.down) {
      if (body.velocity.y < 0) {
        this.playAnimation("jumpUp");
      } else if (body.velocity.y > 0) {
        this.playAnimation("jumpDown");
      }
      return;
    }

    if (body.velocity.x !== 0) {
      this.playAnimation(isRunning ? "run" : "walk");
      return;
    }

    this.playAnimation("idle");
  }
}
