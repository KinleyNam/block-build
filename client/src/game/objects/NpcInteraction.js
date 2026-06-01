export default class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;

    // Launch the UI overlay scene if it isn't already running
    if (!scene.scene.isActive("UIScene")) {
      scene.scene.launch("UIScene");
    }
  }

  _ui() {
    return this.scene.scene.get("UIScene");
  }

  show(npcName, lines, onClose) {
    this.isOpen = true;
    this._ui()?.showDialogue(npcName, lines, () => {
      this.isOpen = false;
      onClose?.();
    });
  }

  advance() {
    this._ui()?.advanceDialogue();
  }

  // Called every frame from the game scene — nothing needed here
  update() {}
}
