import Phaser from "phaser";
import DialogueBox from "./NpcInteraction";
import gameState, { BUILDING_TYPES } from "../gameState";

const INTERACT_DIST = 80;

export default class LandSignboard {
  // parcelTokenId: numeric 1–5 (matches LandNFT tokenId and BuildingNFT parcelId)
  constructor(scene, x, y, landId, ownerAddress, parcelTokenId) {
    this.scene         = scene;
    this.landId        = landId;
    this.ownerAddress  = ownerAddress.toLowerCase();
    this.parcelTokenId = parcelTokenId;

    this.sprite = scene.add.image(x, y, "ownerSignboard")
      .setOrigin(0.5, 1)
      .setScale(1)
      .setDepth(4);

    this._ePrompt = scene.add.image(x, y - this.sprite.displayHeight - 8, "eKeyPrompt")
      .setScale(1)
      .setDepth(4)
      .setVisible(false);

    this._dialogue = new DialogueBox(scene);
    this._eKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  _isOwner() {
    return (
      gameState.walletAddress &&
      this.ownerAddress === gameState.walletAddress.toLowerCase()
    );
  }

  _buildingLines() {
    const building = gameState.placedBuildings[this.parcelTokenId];
    if (!building) return ["No building on this land."];
    const type = BUILDING_TYPES[building.buildingType];
    return [`Building: ${type?.name ?? "Unknown"} Lv.${building.level}`];
  }

  update(player) {
    if (!player) return;
    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      player.x,      player.y,
    );
    const near = dist < INTERACT_DIST;
    this._ePrompt.setVisible(near);

    if (near && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      if (this._isOwner()) {
        window.dispatchEvent(new CustomEvent("show-building-manage", {
          detail: { parcelId: this.parcelTokenId, parcelLabel: this.landId },
        }));
      } else {
        window.dispatchEvent(new CustomEvent("show-worker-ui", {
          detail: { parcelId: this.parcelTokenId, parcelLabel: this.landId },
        }));
      }
    }
  }

  destroy() {
    this._ePrompt?.destroy();
    this.sprite?.destroy();
  }
}
