import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "playerIdle");

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setGravityY(800);
        this.setScale(1.75);

        this.setFlipX(true);

        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.shiftKey = scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SHIFT
        );
    }

    update() {
    const walkSpeed = 180;
    const runSpeed = 350;

    const isRunning = this.shiftKey.isDown;
    const speed = isRunning ? runSpeed : walkSpeed;

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

    if (this.keys.up.isDown && body.blocked.down) {
        body.setVelocityY(-325);
    }

    // AIR ANIMATIONS FIRST
    if (!body.blocked.down) {
        if (body.velocity.y < 0) {
            this.anims.play("jumpUp", true);
        } else if (body.velocity.y > 0) {
            this.anims.play("jumpDown", true);
        }
        return;
    }

        // GROUND ANIMATIONS
        if (body.velocity.x !== 0) {
            this.anims.play(isRunning ? "run" : "walk", true);
        } else {
            this.anims.play("idle", true);
        }
    }
}