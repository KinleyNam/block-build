import Phaser from "phaser";
import { getCharacterKeys, CHAR_FRAME_W, CHAR_FRAME_H } from "../assets";

const NAME_STYLE = {
  fontFamily:      "Georgia",
  fontSize:        "16px",
  color:           "#ffffff",
  fontStyle:       "bold",
  stroke:          "#000000",
  strokeThickness: 3,
};

const CHAR_SCALE = 1.8;
// These aren't used for RemotePlayer (no physics body) but kept for reference

export default class RemotePlayer extends Phaser.GameObjects.Sprite {
  constructor(scene, data) {
    // Resolve skin texture — fall back to legacy playerIdle if pack not loaded yet
    const { gender = "Male", customization = {} } = data;
    const { skin, hair, top, bot, boots, under } = getCharacterKeys(gender, customization);
    const skinKey = scene.textures.exists(skin) ? skin : "playerIdle";

    super(scene, data.x, data.y, skinKey);
    scene.add.existing(this);
    this.setScale(CHAR_SCALE);
    this.setDepth(5);
    this.setFlipX(data.flipX ?? true);

    this._skinKey = skinKey;
    this.targetX  = data.x;
    this.targetY  = data.y;

    // Overlay layers
    const layerKeys = [under, boots, bot, top, hair].filter(k => scene.textures.exists(k));
    this._layers = layerKeys.map(key =>
      scene.add.sprite(data.x, data.y, key)
        .setScale(CHAR_SCALE)
        .setFlipX(data.flipX ?? true)
        .setDepth(5.1)
    );

    this._nameTag = scene.add.text(data.x, data.y, "", NAME_STYLE)
      .setOrigin(0.5, 1).setScale(0.5).setDepth(10);
    if (data.username) this.setUsername(data.username);

    if (data.anim) this._playAnim(data.anim);
  }

  setUsername(name) {
    this._username = name;
    this._nameTag?.setText(name);
  }

  _playAnim(baseKey) {
    if (!this.active || !this.anims) return;
    const full = `${this._skinKey}_${baseKey}`;
    const key  = this.scene.anims.exists(full) ? full : baseKey;
    if (this.anims.currentAnim?.key !== key) this.anims.play(key, true);
  }

  _syncLayers() {
    const frameIdx = this.anims.currentFrame?.textureFrame ?? 0;
    const fx = this.flipX;
    for (const layer of this._layers) {
      layer.setPosition(this.x, this.y);
      layer.setFrame(frameIdx);
      layer.setFlipX(fx);
    }
  }

  updateFromServer(data) {
    this.targetX = data.x;
    this.targetY = data.y;
    this.setFlipX(data.flipX ?? true);
    if (data.anim) this._playAnim(data.anim);
  }

  showEmoji(key) {
    if (this._emojiTimer) { this._emojiTimer.remove(); this._emojiTimer = null; }
    if (!this._emojiSprite) {
      this._emojiSprite = this.scene.add.sprite(this.x, this.y, key)
        .setScale(1.5).setDepth(15);
    } else {
      this._emojiSprite.setTexture(key);
      this._emojiSprite.setVisible(true);
    }
    this._emojiSprite.play(key);
    this._emojiTimer = this.scene.time.delayedCall(3000, () => {
      this._emojiSprite?.setVisible(false);
    });
  }

  update(delta) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    if (Math.abs(dx) > 300 || Math.abs(dy) > 300) {
      this.setPosition(this.targetX, this.targetY);
    } else {
      const t = Math.min(1, delta * 0.025);
      this.x = Math.round(this.x + dx * t);
      this.y = Math.round(this.y + dy * t);
    }

    this._syncLayers();

    const tagY = this.y - this.displayHeight * 0.5 + 29;
    this._nameTag?.setPosition(this.x, tagY);
    if (this._emojiSprite?.visible) {
      this._emojiSprite.setPosition(this.x, tagY - 19);
    }
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
    this._layers.forEach(l => l.destroy());
    this._layers = [];
    this._nameTag?.destroy();
    this._emojiSprite?.destroy();
    this._emojiTimer?.remove();
    super.destroy();
  }
}
