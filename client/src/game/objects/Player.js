import Phaser from "phaser";
import { getCharacterKeys, CHAR_FRAME_W, CHAR_FRAME_H } from "../assets";
import gameState from "../gameState";

const WALK_SPEED    = 180;
const RUN_SPEED     = 350;
const JUMP_VELOCITY = -325;
const CHAR_SCALE    = 1.8;

// Physics body (local/unscaled pixels). Character body is ~16px wide, ~40px tall
// within the 80×64 frame, centered horizontally, bottom-aligned.
const BODY_W      = 14;
const BODY_H      = 40;
const BODY_OFFS_X = (CHAR_FRAME_W - BODY_W) / 2;  // 33 for 80px frame
const BODY_OFFS_Y = CHAR_FRAME_H - BODY_H;          // 24 for 64px frame

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const { skin, hair, top, bot, boots, under } = getCharacterKeys(
      gameState.gender,
      gameState.customization,
    );
    const skinKey = scene.textures.exists(skin) ? skin : "playerIdle";

    super(scene, x, y, skinKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._skinKey  = skinKey;
    this._baseAnim = "idle";

    this.setCollideWorldBounds(true);
    this.body.setGravityY(800);
    this.setScale(CHAR_SCALE);
    this.setFlipX(true);
    this.setDepth(5);
    this.body.setSize(BODY_W, BODY_H);
    this.body.setOffset(BODY_OFFS_X, BODY_OFFS_Y);

    // Overlay layers stacked in order: underwear → boots → pants → shirt → hair
    const layerKeys = [under, boots, bot, top, hair].filter(k => scene.textures.exists(k));
    this._layers = layerKeys.map(key =>
      scene.add.sprite(x, y, key)
        .setScale(CHAR_SCALE)
        .setFlipX(true)
        .setDepth(5.1)
    );

    // Sync layers AFTER physics postUpdate so sprite.x/y reflect the physics step.
    // Reading this.x inside scene update() gives the previous frame's position
    // because physics postUpdate (which moves the sprite) runs after scene update().
    this._boundSyncLayers = this._syncLayers.bind(this);
    scene.events.on('postupdate', this._boundSyncLayers);

    this.keys = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  playAnimation(baseKey) {
    const full = this._skinKey + "_" + baseKey;
    const key  = this.scene.anims.exists(full) ? full : baseKey;
    if (this.anims.currentAnim?.key !== key) this.anims.play(key, true);
    this._baseAnim = baseKey;
  }

  _syncLayers() {
    if (!this.active) return;
    const frameIdx = this.anims.currentFrame?.textureFrame ?? 0;
    const fx = this.flipX;
    for (const layer of this._layers) {
      layer.setPosition(this.x, this.y);
      layer.setFrame(frameIdx);
      layer.setFlipX(fx);
      layer.setVisible(this.visible);
    }
  }

  update() {
    const isRunning = this.shiftKey.isDown;
    const speed     = isRunning ? RUN_SPEED : WALK_SPEED;
    const body      = this.body;

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
      this.playAnimation(body.velocity.y < 0 ? "jumpUp" : "jumpDown");
    } else if (body.velocity.x !== 0) {
      this.playAnimation(isRunning ? "run" : "walk");
    } else {
      this.playAnimation("idle");
    }
    // NOTE: _syncLayers() is NOT called here — it runs in the 'postupdate' listener
    // so it reads the sprite position AFTER physics has moved it this frame.
  }

  addWeaponLayer(key) {
    if (!this.scene?.textures.exists(key)) return;
    const layer = this.scene.add.sprite(this.x, this.y, key)
      .setScale(CHAR_SCALE)
      .setFlipX(this.flipX)
      .setDepth(5.2);
    this._layers.push(layer);
  }

  setLayersVisible(visible) {
    this._layers.forEach(l => l.setVisible(visible));
  }

  destroy() {
    if (this.scene) {
      this.scene.events.off('postupdate', this._boundSyncLayers);
    }
    this._layers.forEach(l => l.destroy());
    this._layers = [];
    super.destroy();
  }
}
