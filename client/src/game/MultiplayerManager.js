import Phaser from "phaser";
import socket from "./socket";
import RemotePlayer from "./objects/RemotePlayer";
import gameState from "./gameState";

const G_PROMPT_RANGE = 80; // world units — same as NPC dialogue range

const SCENE_LOADER_MAP = {
  StarterAreaScene:      "world",
  VillageOutskirtsScene: "village",
  MarketPlace:           "market",
  ComDistrictScene:      "commercial",
};

export default class MultiplayerManager {
  constructor(scene, sceneName) {
    this.scene         = scene;
    this.sceneName     = sceneName;
    this.remotePlayers = {};
    this._lastEmit     = 0;
    this.player        = null;

    this._onCurrentPlayers = this._onCurrentPlayers.bind(this);
    this._onPlayerJoined   = this._onPlayerJoined.bind(this);
    this._onPlayerMoved    = this._onPlayerMoved.bind(this);
    this._onPlayerLeft     = this._onPlayerLeft.bind(this);
    this._onPlayerEmoji    = this._onPlayerEmoji.bind(this);
    this._onPvpStart       = this._onPvpStart.bind(this);
    this._onPlayerWorking  = this._onPlayerWorking.bind(this);
  }

  create(player) {
    this.player = player;
    console.log(`[MP] scene="${this.sceneName}" socket="${socket.id}" connected=${socket.connected}`);

    socket.on("currentPlayers", this._onCurrentPlayers);
    socket.on("playerJoined",   this._onPlayerJoined);
    socket.on("playerMoved",    this._onPlayerMoved);
    socket.on("playerLeft",     this._onPlayerLeft);
    socket.on("playerEmoji",    this._onPlayerEmoji);
    socket.on("pvpStart",       this._onPvpStart);
    socket.on("playerWorking",  this._onPlayerWorking);

    if (player) {
      socket.emit("playerMoved", {
        x:             player.x,
        y:             player.y,
        anim:          "idle",
        flipX:         player.flipX,
        scene:         this.sceneName,
        username:      gameState.username,
        walletAddress: gameState.walletAddress,
      });

      // Local player name tag
      this._localNameTag = this.scene.add.text(player.x, player.y, gameState.username ?? "", {
        fontFamily:      "Georgia",
        fontSize:        "16px",
        color:           "#ffffff",
        fontStyle:       "bold",
        stroke:          "#000000",
        strokeThickness: 3,
      }).setOrigin(0.5, 1).setScale(0.5).setDepth(10);
    }

    socket.emit("joinScene", this.sceneName);
    socket.emit("getPlayers");

    // ButtonG prompt image (shown above nearest in-range remote player)
    this._buttonGImg = this.scene.add.image(0, 0, "buttonG")
      .setDepth(20)
      .setScale(1)
      .setVisible(false);

    // G key
    this._gKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);

    this._nearestTarget = null; // { rp: RemotePlayer, id: string }

    this.scene.events.once("shutdown", () => this.destroy());
  }

  update(delta) {
    Object.values(this.remotePlayers).forEach(rp => rp.update(delta));
    this._updateButtonG();

    if (this.player && this._localNameTag) {
      const p = this.player;
      this._localNameTag.setPosition(p.x, p.y - p.displayHeight * 0.5 - 6);
    }
  }

  emitMove(player, time) {
    if (time - this._lastEmit < 50) return;
    this._lastEmit = time;
    socket.emit("playerMoved", {
      x:             player.x,
      y:             player.y,
      anim:          player.anims?.currentAnim?.key ?? "idle",
      flipX:         player.flipX,
      scene:         this.sceneName,
      username:      gameState.username,
      walletAddress: gameState.walletAddress,
    });
  }

  // ── G-button proximity logic ───────────────────────────────────────────────
  _updateButtonG() {
    if (!this.player) return;

    const px = this.player.x;
    const py = this.player.y;
    let nearest   = null;
    let nearestId = null;
    let nearestDist = Infinity;

    for (const [id, rp] of Object.entries(this.remotePlayers)) {
      const dx   = rp.x - px;
      const dy   = rp.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest     = rp;
        nearestId   = id;
      }
    }

    const inRange = nearest && nearestDist < G_PROMPT_RANGE;

    if (inRange) {
      this._buttonGImg
        .setVisible(true)
        .setPosition(nearest.x, nearest.y - nearest.displayHeight * 0.5 - 22);
      this._nearestTarget = { rp: nearest, id: nearestId };
    } else {
      this._buttonGImg.setVisible(false);
      this._nearestTarget = null;
    }

    // G key pressed while a player is in range → open challenge UI or show busy message
    if (inRange && Phaser.Input.Keyboard.JustDown(this._gKey)) {
      const targetUsername = this._nearestTarget.rp._username ?? "Player";

      if (this._nearestTarget.rp._isWorking) {
        this._showBusyMessage(this._nearestTarget.rp, `${targetUsername} is\ncurrently working!`);
        return;
      }

      if (this._nearestTarget.rp._scene === "PvPArena") {
        this._showBusyMessage(this._nearestTarget.rp, `${targetUsername} is in\na PvP match!`);
        return;
      }

      window.dispatchEvent(new CustomEvent("show-pvp-challenge", {
        detail: { targetId: nearestId, targetUsername },
      }));
    }
  }

  // ── pvpStart: server confirmed both players accepted ─────────────────────
  _onPvpStart(data) {
    console.log("[MP] pvpStart received", data);
    // Store match context in gameState so PvPArena can read it
    const returnScene     = this.sceneName;
    const returnLoaderKey = SCENE_LOADER_MAP[returnScene] ?? "world";

    if (this.player) {
      gameState.savePosition(returnScene, this.player.x, this.player.y);
    }

    gameState.pendingPvP = {
      ...data,
      returnScene,
      returnLoaderKey,
    };

    this.scene.cameras.main.fadeOut(600, 0, 0, 0);
    this.scene.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.sound.stopAll();
      this.scene.scene.start("LoadingScene", {
        nextScene: "PvPArena",
        loaderKey: "pvpArena",
      });
    });
  }

  // ── Standard multiplayer handlers ──────────────────────────────────────────
  _onCurrentPlayers(players) {
    console.log(`[MP] currentPlayers received:`, Object.values(players).map(p => `${p.id.slice(0,6)} scene=${p.scene}`));
    Object.values(players).forEach(p => {
      if (p.id !== socket.id && p.scene === this.sceneName) {
        console.log(`[MP] adding from currentPlayers: ${p.id.slice(0,6)}`);
        this._add(p);
      }
    });
  }

  _onPlayerJoined(p) {
    console.log(`[MP] playerJoined: ${p.id.slice(0,6)} scene=${p.scene} myScene=${this.sceneName}`);
    if (p.id !== socket.id && p.scene === this.sceneName) {
      this._add(p);
    }
  }

  _onPlayerMoved(p) {
    if (p.id === socket.id) return;
    if (p.scene === this.sceneName) {
      if (this.remotePlayers[p.id]) {
        this.remotePlayers[p.id].updateFromServer(p);
        if (p.username)  this.remotePlayers[p.id].setUsername(p.username);
        this.remotePlayers[p.id]._isWorking = p.isWorking ?? false;
      } else {
        console.log(`[MP] adding from playerMoved: ${p.id.slice(0,6)}`);
        this._add(p);
      }
      this.remotePlayers[p.id]._scene = p.scene;
    } else if (p.scene === "PvPArena" && this.remotePlayers[p.id]) {
      // Player entered PvP — keep their sprite visible but mark them as busy
      this.remotePlayers[p.id]._scene = "PvPArena";
    } else {
      this._remove(p.id);
    }
  }

  _onPlayerLeft(id) {
    console.log(`[MP] playerLeft: ${id.slice(0,6)}`);
    this._remove(id);
  }

  _onPlayerEmoji({ id, emoji, scene }) {
    if (scene !== this.sceneName) return;
    const rp = this.remotePlayers[id];
    if (rp) rp.showEmoji(emoji);
  }

  _showBusyMessage(rp, message) {
    if (this._pvpBusyMsg) return; // debounce — only one at a time
    this._pvpBusyMsg = this.scene.add.text(
      rp.x, rp.y - 60,
      message,
      {
        fontFamily:      "Georgia",
        fontSize:        "24px",
        color:           "#ffffff",
        fontStyle:       "bold",
        backgroundColor: "#00000099",
        padding:         { x: 16, y: 10 },
        align:           "center",
      }
    ).setOrigin(0.5, 1).setScale(0.5).setDepth(30);

    this.scene.tweens.add({
      targets:  this._pvpBusyMsg,
      alpha:    0,
      y:        this._pvpBusyMsg.y - 18,
      duration: 2200,
      ease:     "Power2",
      onComplete: () => {
        this._pvpBusyMsg?.destroy();
        this._pvpBusyMsg = null;
      },
    });
  }

  _onPlayerWorking({ id, isWorking }) {
    if (this.remotePlayers[id]) {
      this.remotePlayers[id]._isWorking = isWorking;
    }
  }

  _add(data) {
    if (this.remotePlayers[data.id]) return;
    console.log(`[MP] spawning RemotePlayer at x=${data.x} y=${data.y}`);
    const rp = new RemotePlayer(this.scene, data);
    rp._scene = data.scene;
    this.remotePlayers[data.id] = rp;
  }

  _remove(id) {
    this.remotePlayers[id]?.destroy();
    delete this.remotePlayers[id];
  }

  destroy() {
    socket.off("currentPlayers", this._onCurrentPlayers);
    socket.off("playerJoined",   this._onPlayerJoined);
    socket.off("playerMoved",    this._onPlayerMoved);
    socket.off("playerLeft",     this._onPlayerLeft);
    socket.off("playerEmoji",    this._onPlayerEmoji);
    socket.off("pvpStart",       this._onPvpStart);
    socket.off("playerWorking",  this._onPlayerWorking);
    Object.values(this.remotePlayers).forEach(rp => rp.destroy());
    this.remotePlayers  = {};
    this._localNameTag?.destroy();
    this._localNameTag  = null;
    this._buttonGImg?.destroy();
    this._gKey?.destroy();
  }
}
