import Phaser from "phaser";
import DialogueBox from "./NpcInteraction";

const INTERACT_DIST = 80;

export default class LandSignboard {
  constructor(scene, x, y, landId, ownerName) {
    this.scene     = scene;
    this.landId    = landId;
    this.ownerName = ownerName;

    this.sprite = scene.add.image(x, y, "ownerSignboard")
      .setOrigin(0.5, 1)
      .setScale(1);

    this._ePrompt = scene.add.image(x, y - this.sprite.displayHeight - 8, "eKeyPrompt")
      .setScale(1)
      .setVisible(false);

    this._dialogue = new DialogueBox(scene);
    this._eKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  update(player) {
    if (!player) return;
    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      player.x,      player.y,
    );
    const near = dist < INTERACT_DIST;

    this._ePrompt.setVisible(near && !this._dialogue.isOpen);

    if (near && !this._dialogue.isOpen && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      const display = this.ownerName.startsWith("0x")
        ? `${this.ownerName.slice(0, 6)}…${this.ownerName.slice(-4)}`
        : this.ownerName;
      this._dialogue.show(
        `Land ${this.landId}`,
        [`Owner: ${display}`],
      );
    } else if (this._dialogue.isOpen && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      this._dialogue.advance();
    }
  }

  destroy() {
    this._ePrompt?.destroy();
    this.sprite?.destroy();
  }
}
