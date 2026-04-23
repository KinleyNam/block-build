import Phaser from "phaser";

const BOX_H = 110;   // px
const MARGIN = 14;   // px from bottom
const PAD_X = 18;    // px horizontal padding
const PAD_Y = 14;    // px vertical padding
const NAME_LINE_H = 24; // px below name before body text

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene", active: false });
    this.lines = [];
    this.lineIndex = 0;
    this.isOpen = false;
    this._onClose = null;
  }

  create() {
    this.bg = this.add.graphics();
    this.border = this.add.graphics();

    this.nameText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#d4a030",
      fontStyle: "bold",
    });

    this.bodyText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#ede0c4",
      wordWrap: { width: 100 }, // set properly in _layout
    });

    this.hintText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#907860",
    }).setOrigin(1, 1);

    this._setVisible(false);
    this._layout();

    this.scale.on("resize", this._layout, this);
  }

  _layout() {
    const W = this.scale.width;
    const H = this.scale.height;

    const boxW = Math.floor(W * 0.84);
    const boxX = Math.floor((W - boxW) / 2);
    const boxY = H - MARGIN - BOX_H;

    this.bg.clear();
    this.bg.fillStyle(0x0d0600, 0.93);
    this.bg.fillRoundedRect(boxX, boxY, boxW, BOX_H, 6);

    this.border.clear();
    this.border.lineStyle(2, 0xc89030, 1);
    this.border.strokeRoundedRect(boxX, boxY, boxW, BOX_H, 6);

    this.nameText.setPosition(boxX + PAD_X, boxY + PAD_Y);
    this.bodyText
      .setPosition(boxX + PAD_X, boxY + PAD_Y + NAME_LINE_H)
      .setWordWrapWidth(boxW - PAD_X * 2);
    this.hintText.setPosition(boxX + boxW - PAD_X, boxY + BOX_H - PAD_Y);
  }

  showDialogue(npcName, lines, onClose) {
    this.lines = lines;
    this.lineIndex = 0;
    this.isOpen = true;
    this._onClose = onClose ?? null;
    this.nameText.setText(npcName);
    this._updateLine();
    this._setVisible(true);
  }

  advanceDialogue() {
    if (!this.isOpen) return;
    this.lineIndex++;
    if (this.lineIndex >= this.lines.length) {
      this.isOpen = false;
      this._setVisible(false);
      if (this._onClose) this._onClose();
    } else {
      this._updateLine();
    }
  }

  _updateLine() {
    this.bodyText.setText(this.lines[this.lineIndex]);
    this.hintText.setText(
      this.lineIndex >= this.lines.length - 1 ? "[ E ]  Close" : "[ E ]  Continue"
    );
  }

  _setVisible(v) {
    this.bg.setVisible(v);
    this.border.setVisible(v);
    this.nameText.setVisible(v);
    this.bodyText.setVisible(v);
    this.hintText.setVisible(v);
  }
}
