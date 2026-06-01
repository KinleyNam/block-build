import Phaser from "phaser";

const NAME_STYLE = {
  fontFamily:      "Georgia",
  fontSize:        "16px",
  color:           "#ffffff",
  fontStyle:       "bold",
  stroke:          "#000000",
  strokeThickness: 3,
};

export default class RemotePlayer extends Phaser.GameObjects.Sprite {
  constructor(scene, data) {
    super(scene, data.x, data.y, "playerIdle");
    scene.add.existing(this);
    this.setScale(1.75);
    this.setDepth(5);
    this.setFlipX(data.flipX ?? true);
    this.targetX = data.x;
    this.targetY = data.y;
    if (data.anim) this._playAnim(data.anim);

    this._nameTag = scene.add.text(data.x, data.y, "", NAME_STYLE)
      .setOrigin(0.5, 1).setScale(0.5).setDepth(10);
    if (data.username) this.setUsername(data.username);
  }

  setUsername(name) {
    this._username = name;
    this._nameTag?.setText(name);
  }

  _playAnim(key) {
    if (!this.active || !this.anims) return;
    if (this.anims.currentAnim?.key !== key) {
      this.anims.play(key, true);
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
        .setScale(1.5)
        .setDepth(15);
    } else {
      this._emojiSprite.setTexture(key);
      this._emojiSprite.setVisible(true);
    }
    this._emojiSprite.play(key);

    this._emojiTimer = this.scene.time.delayedCall(3000, () => {
      this._emojiSprite?.setVisible(false);
    });
  }

  // Called every frame — lerp toward the last known server position
  update(delta) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    // Teleport if too far (e.g. just spawned) to avoid long slides
    if (Math.abs(dx) > 300 || Math.abs(dy) > 300) {
      this.setPosition(this.targetX, this.targetY);
    } else {
      const t = Math.min(1, delta * 0.025);
      // Round to integer pixels — prevents sub-pixel blur on pixel-art sprites
      this.x = Math.round(this.x + dx * t);
      this.y = Math.round(this.y + dy * t);
    }

    const tagY = this.y - this.displayHeight * 0.5 - 6;
    this._nameTag?.setPosition(this.x, tagY);

    if (this._emojiSprite?.visible) {
      this._emojiSprite.setPosition(this.x, tagY - 4);
    }
  }

  destroy() {
    this._nameTag?.destroy();
    this._emojiSprite?.destroy();
    this._emojiTimer?.remove();
    super.destroy();
  }
}
