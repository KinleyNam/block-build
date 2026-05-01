import Phaser from "phaser";

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
  }

  _playAnim(key) {
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

  // Called every frame — lerp toward the last known server position
  update(delta) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    // Teleport if too far (e.g. just spawned) to avoid long slides
    if (Math.abs(dx) > 300 || Math.abs(dy) > 300) {
      this.setPosition(this.targetX, this.targetY);
      return;
    }

    const t = Math.min(1, delta * 0.025);
    this.x += dx * t;
    this.y += dy * t;
  }
}
