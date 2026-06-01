import Phaser from "phaser";
import socket from "../socket";

export const EMOJI_KEYS = [
  "emoji_angry",  "emoji_crying",   "emoji_disappointed",
  "emoji_loveeyes", "emoji_question", "emoji_raisedeyebrow",
  "emoji_skull",  "emoji_smiling",  "emoji_yawning",
];

const COLS             = 3;
const CELL             = 22;   // world units per cell
const PAD              = 3;    // world units padding around grid
const GAP              = 2;    // world units gap/border between cells
const DISPLAY_DURATION = 3000; // ms the selected emoji stays visible (also cooldown)

export default class EmojiPicker {
  constructor(scene, player, sceneName) {
    this.scene     = scene;
    this.player    = player;
    this.sceneName = sceneName;

    this._pickerVisible = false;
    this._hideTimer     = null;
    this._onCooldown    = false;

    this.qKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this._buildPicker();
    this._buildDisplay();

    scene.events.once("shutdown", () => this.destroy());
  }

  _buildPicker() {
    const rows = Math.ceil(EMOJI_KEYS.length / COLS);
    const w    = COLS * CELL + (COLS - 1) * GAP + PAD * 2;
    const h    = rows * CELL + (rows - 1) * GAP + PAD * 2;

    this._pickerW = w;
    this._pickerH = h;

    this.container = this.scene.add.container(0, 0).setDepth(20).setVisible(false);

    const bg = this.scene.add.rectangle(0, 0, w, h, 0x1a1208, 0.88);
    bg.setStrokeStyle(1, 0x8b6914);
    this.container.add(bg);

    EMOJI_KEYS.forEach((key, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = -w / 2 + PAD + col * (CELL + GAP) + CELL / 2;
      const cy  = -h / 2 + PAD + row * (CELL + GAP) + CELL / 2;

      // Cell background with border to visually separate each emoji
      const cellBg = this.scene.add.rectangle(cx, cy, CELL, CELL, 0x2a1a0a, 1);
      cellBg.setStrokeStyle(1, 0x8b6914);
      this.container.add(cellBg);

      const spr = this.scene.add.sprite(cx, cy, key).setScale(1).setInteractive({ useHandCursor: true });
      spr.play(key);

      spr.on("pointerover", () => cellBg.setFillStyle(0x4a2e10));
      spr.on("pointerout",  () => cellBg.setFillStyle(0x2a1a0a));
      spr.on("pointerdown", () => this._select(key));

      this.container.add(spr);
    });
  }

  _buildDisplay() {
    this.displaySprite = this.scene.add.sprite(0, 0, EMOJI_KEYS[0])
      .setScale(1.5)
      .setDepth(25)
      .setVisible(false);
  }

  _select(key) {
    if (this._onCooldown) return;
    this._onCooldown = true;

    // Close the picker immediately
    this._pickerVisible = false;
    this.container.setVisible(false);

    this._showDisplay(key);
    socket.emit("playerEmoji", { emoji: key, scene: this.sceneName });
  }

  showEmoji(key) {
    this._showDisplay(key);
  }

  _showDisplay(key) {
    if (this._hideTimer) { this._hideTimer.remove(); this._hideTimer = null; }
    this.displaySprite.setVisible(true);
    this.displaySprite.setTexture(key);
    this.displaySprite.play(key);
    this._hideTimer = this.scene.time.delayedCall(DISPLAY_DURATION, () => {
      this.displaySprite.setVisible(false);
      this._onCooldown = false;
    });
  }

  update() {
    const p     = this.player;
    const qDown = this.qKey.isDown;

    const shouldShow = qDown && !this._onCooldown;
    if (shouldShow !== this._pickerVisible) {
      this._pickerVisible = shouldShow;
      this.container.setVisible(shouldShow);
    }

    if (qDown) {
      const topY = p.y - p.displayHeight * 0.5;
      this.container.setPosition(p.x, topY - this._pickerH * 0.5 - 3);
    }

    if (this.displaySprite.visible) {
      this.displaySprite.setPosition(p.x, p.y - p.displayHeight * 0.5 - 8);
    }
  }

  destroy() {
    this.container?.destroy();
    this.displaySprite?.destroy();
    this._hideTimer?.remove();
  }
}
