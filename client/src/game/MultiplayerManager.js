import socket from "./socket";
import RemotePlayer from "./objects/RemotePlayer";

export default class MultiplayerManager {
  constructor(scene, sceneName) {
    this.scene      = scene;
    this.sceneName  = sceneName;
    this.remotePlayers = {};
    this._lastEmit  = 0;

    this._onCurrentPlayers = this._onCurrentPlayers.bind(this);
    this._onPlayerJoined   = this._onPlayerJoined.bind(this);
    this._onPlayerMoved    = this._onPlayerMoved.bind(this);
    this._onPlayerLeft     = this._onPlayerLeft.bind(this);
  }

  create(player) {
    console.log(`[MP] scene="${this.sceneName}" socket="${socket.id}" connected=${socket.connected}`);

    socket.on("currentPlayers", this._onCurrentPlayers);
    socket.on("playerJoined",   this._onPlayerJoined);
    socket.on("playerMoved",    this._onPlayerMoved);
    socket.on("playerLeft",     this._onPlayerLeft);

    if (player) {
      socket.emit("playerMoved", {
        x:     player.x,
        y:     player.y,
        anim:  "idle",
        flipX: player.flipX,
        scene: this.sceneName,
      });
    }

    socket.emit("joinScene", this.sceneName);
    socket.emit("getPlayers");

    this.scene.events.once("shutdown", () => this.destroy());
  }

  update(delta) {
    Object.values(this.remotePlayers).forEach(rp => rp.update(delta));
  }

  emitMove(player, time) {
    if (time - this._lastEmit < 50) return;
    this._lastEmit = time;
    socket.emit("playerMoved", {
      x:     player.x,
      y:     player.y,
      anim:  player.anims?.currentAnim?.key ?? "idle",
      flipX: player.flipX,
      scene: this.sceneName,
    });
  }

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
      } else {
        console.log(`[MP] adding from playerMoved: ${p.id.slice(0,6)}`);
        this._add(p);
      }
    } else {
      this._remove(p.id);
    }
  }

  _onPlayerLeft(id) {
    console.log(`[MP] playerLeft: ${id.slice(0,6)}`);
    this._remove(id);
  }

  _add(data) {
    if (this.remotePlayers[data.id]) return;
    console.log(`[MP] spawning RemotePlayer at x=${data.x} y=${data.y}`);
    this.remotePlayers[data.id] = new RemotePlayer(this.scene, data);
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
    Object.values(this.remotePlayers).forEach(rp => rp.destroy());
    this.remotePlayers = {};
  }
}
