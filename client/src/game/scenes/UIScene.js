import Phaser from "phaser";
import gameState from "../gameState";
import { getLeaderboard } from "../../api";

// ── Dialogue box constants ──────────────────────────────────────
const BOX_H      = 110;
const MARGIN     = 14;
const PAD_X      = 18;
const PAD_Y      = 14;
const NAME_LINE_H = 24;

const DEFAULT_LEADERBOARD = [
  "1. Kami_Sama_910",
  "2. Euclid_606",
  "3. Kith_Keso",
];

export function ensureHud(scene) {
  if (!scene.scene.isActive("UIScene")) {
    scene.scene.launch("UIScene");
  }
  scene.scene.bringToTop("UIScene");
}

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene", active: false });
    this.lines     = [];
    this.lineIndex = 0;
    this.isOpen    = false;
    this._onClose  = null;
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────

  create() {
    // ── HUD ───────────────────────────────────────────────────
    this.escapeKeyImage   = this.add.image(0, 0, "uiEscapeKey").setOrigin(0, 0);
    this.goldHolderImage  = this.add.image(0, 0, "uiGoldHolder").setOrigin(1, 0);
    this.leaderBoardImage = this.add.image(0, 0, "uiLeaderBoard").setOrigin(1, 0);

    this.goldText = this.add.text(0, 0, String(gameState.gold), {
      fontFamily: "monospace", fontSize: "20px",
      color: "#fff4cf", fontStyle: "bold",
    }).setOrigin(0.5, 0.5);

    this._onGoldChange = () => {
      this.goldText.setText(String(gameState.gold));
      this._layout();
    };
    gameState.on(this._onGoldChange);

    this.leaderboardText = this.add.text(0, 0, DEFAULT_LEADERBOARD.join("\n"), {
      fontFamily: "monospace", fontSize: "22px",
      color: "#fff7e4", fontStyle: "bold",
      lineSpacing: 10, align: "left",
    }).setOrigin(0.5, 0);

    // ── Dialogue box ──────────────────────────────────────────
    this.bg     = this.add.graphics();
    this.border = this.add.graphics();

    this.nameText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif", fontSize: "18px",
      color: "#d4a030", fontStyle: "bold",
    });
    this.bodyText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif", fontSize: "16px",
      color: "#ede0c4", wordWrap: { width: 100 },
    });
    this.hintText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif", fontSize: "13px", color: "#907860",
    }).setOrigin(1, 1);

    this._setVisible(false);

    // ── React escape menu bridge ──────────────────────────────
    // The React EscapeMenu component dispatches this event when opened/closed.
    // We disable/enable input on all game scenes so the game doesn't react
    // to keyboard/pointer events while the menu is open.
    this._onEscapeMenu = (e) => {
      const open = e.detail?.open ?? false;
      this.scene.manager.getScenes(true).forEach(s => {
        if (s !== this) s.input.enabled = !open;
      });
    };
    window.addEventListener("escape-menu", this._onEscapeMenu);

    // ── Leaderboard polling ───────────────────────────────────────
    this._fetchLeaderboard();
    this._lbTimer = this.time.addEvent({
      delay: 30000, loop: true,
      callback: this._fetchLeaderboard, callbackScope: this,
    });

    // ── Layout ────────────────────────────────────────────────
    this._layout();
    this.scale.on("resize", this._layout, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this._layout, this);
      window.removeEventListener("escape-menu", this._onEscapeMenu);
      gameState.off(this._onGoldChange);
      this._lbTimer?.remove();
    });
  }

  async _fetchLeaderboard() {
    try {
      const lines = await getLeaderboard();
      if (lines?.length) this.setLeaderboard(lines);
    } catch { /* network error — keep current display */ }
  }

  // ─────────────────────────────────────────────────────────────
  // Dialogue API (called by game scenes / TutorialController)
  // ─────────────────────────────────────────────────────────────

  showDialogue(npcName, lines, onClose) {
    this.lines     = lines;
    this.lineIndex = 0;
    this.isOpen    = true;
    this._onClose  = onClose ?? null;
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

  forceCloseDialogue() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._setVisible(false);
    if (this._onClose) {
      const cb = this._onClose;
      this._onClose = null;
      cb();
    }
  }

  setGold(amount) {
    if (!this.goldText) return;
    this.goldText.setText(String(amount));
    this._layout();
  }

  setLeaderboard(lines) {
    this.leaderboardText.setText(lines.join("\n"));
    this._layout();
  }

  setOverworldHudVisible(visible) {
    this.escapeKeyImage.setVisible(visible);
    this.goldHolderImage.setVisible(visible);
    this.leaderBoardImage.setVisible(visible);
    this.goldText.setVisible(visible);
    this.leaderboardText.setVisible(visible);
  }

  // ─────────────────────────────────────────────────────────────
  // Layout — called on create and every resize
  // ─────────────────────────────────────────────────────────────

  _layout() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── HUD ───────────────────────────────────────────────────
    const topPad  = 18;
    const sidePad = 18;
    const goldScale = (this.escapeKeyImage.height / this.goldHolderImage.height) * 1.3;

    this.escapeKeyImage.setPosition(sidePad, topPad).setScale(1.25);
    this.goldHolderImage.setPosition(W - sidePad, topPad).setScale(goldScale);
    this.leaderBoardImage
      .setPosition(W - sidePad, topPad + this.goldHolderImage.displayHeight + 10)
      .setScale(0.21);

    this.goldText.setPosition(
      this.goldHolderImage.x - this.goldHolderImage.displayWidth / 2,
      this.goldHolderImage.y + this.goldHolderImage.displayHeight / 2.2,
    );
    this.leaderboardText
      .setWordWrapWidth(this.leaderBoardImage.displayWidth - 20, true)
      .setPosition(
        this.leaderBoardImage.x - this.leaderBoardImage.displayWidth / 2,
        this.leaderBoardImage.y + 45,
      );

    // ── Dialogue box ──────────────────────────────────────────
    const boxW = Math.floor(W * 0.84);
    const boxX = Math.floor((W - boxW) / 2);
    const boxY = H - MARGIN - BOX_H;

    this.bg.clear().fillStyle(0x0d0600, 0.93).fillRoundedRect(boxX, boxY, boxW, BOX_H, 6);
    this.border.clear().lineStyle(2, 0xc89030, 1).strokeRoundedRect(boxX, boxY, boxW, BOX_H, 6);

    this.nameText.setPosition(boxX + PAD_X, boxY + PAD_Y);
    this.bodyText
      .setPosition(boxX + PAD_X, boxY + PAD_Y + NAME_LINE_H)
      .setWordWrapWidth(boxW - PAD_X * 2);
    this.hintText.setPosition(boxX + boxW - PAD_X, boxY + BOX_H - PAD_Y);
  }

  // ─────────────────────────────────────────────────────────────
  // Dialogue helpers
  // ─────────────────────────────────────────────────────────────

  _updateLine() {
    this.bodyText.setText(this.lines[this.lineIndex]);
    this.hintText.setText(
      this.lineIndex >= this.lines.length - 1 ? "[ E ]  Close" : "[ E ]  Continue"
    );
  }

  _setVisible(visible) {
    this.bg.setVisible(visible);
    this.border.setVisible(visible);
    this.nameText.setVisible(visible);
    this.bodyText.setVisible(visible);
    this.hintText.setVisible(visible);
  }
}
