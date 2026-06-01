import Phaser from "phaser";
import Player from "../objects/Player";
import RemotePlayer from "../objects/RemotePlayer";
import { createPvPAnimations, getWeaponTextureKey } from "../assets";
import socket from "../socket";
import gameState from "../gameState";
import { getGoldBalance } from "../contractService";
import EmojiPicker from "../objects/EmojiPicker";

const CAMERA_ZOOM    = 2;
const GROUND_OVERLAP = 1;
const ATTACK_COOL    = 700;
// Frame 54 = 5th frame of the character pack attack row (frames 50-55), the sword contact frame
const SWORD_FRAME    = 54;
const TELEPORT_COOL  = 1500;

const MAX_STAMINA       = 100;
const ATTACK_ST_COST    = 25;
const TELEPORT_ST_COST  = 35;
const ST_REGEN_RATE     = 27;   // per second — moderate (0→100 in ~3.7s)
const ST_REGEN_DELAY    = 1000; // ms before regen starts
const BAR_W             = 90;   // natural image width
const BAR_H             = 28;   // natural image height
const HUD_SCALE         = 1.5;  // uniform scale for all HUD bar sprites
// Measured from HeartSpriteSheet.png: x=0..27 are opaque (heart icon),
// x=28..86 are transparent (bar window). Crop formula must account for this
// so the bar reaches truly empty only when ratio=0, not at ratio≈0.31.
const HEART_OPAQUE_W    = 28;   // px of solid heart-icon pixels on the left
const BAR_CONTENT_W     = BAR_W - HEART_OPAQUE_W; // = 62, the visible bar window

export default class PvPArena extends Phaser.Scene {
  constructor() {
    super("PvPArena");
  }

  init() {
    this.matchData = gameState.pendingPvP ?? {};
  }

  create() {
    // Tell the server this player is now in PvPArena so all overworld scenes
    // receive a playerMoved with scene="PvPArena" and remove the ghost sprite.
    socket.emit("joinScene", "PvPArena");

    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const arenaW  = Math.floor(screenW / CAMERA_ZOOM);
    const arenaH  = Math.floor(screenH / CAMERA_ZOOM);

    // ── Camera ────────────────────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, arenaW, arenaH);
    const cam = this.cameras.main;
    cam.setZoom(CAMERA_ZOOM);
    cam.setBounds(0, 0, arenaW, arenaH);
    cam.setBackgroundColor("#87c9e8");
    cam.roundPixels = true;
    cam.fadeIn(450, 0, 0, 0);

    // ── Background ────────────────────────────────────────────────────────────
    this._buildBackground(arenaW, arenaH);

    // ── Ground ────────────────────────────────────────────────────────────────
    const groundH    = 48;
    const groundY    = arenaH - groundH;
    this.groundGroup = this.physics.add.staticGroup();
    const gt    = this.textures.get("ground").getSourceImage();
    const gScale = groundH / gt.height;
    const gTileW = gt.width * gScale;
    for (let i = 0; i < Math.ceil(arenaW / gTileW); i++) {
      const tile = this.groundGroup.create(i * gTileW, groundY, "ground").setOrigin(0, 0);
      tile.setScale(gScale);
      tile.displayWidth = Math.ceil(gTileW) + GROUND_OVERLAP;
      tile.refreshBody();
    }

    // ── Animations ────────────────────────────────────────────────────────────
    createPvPAnimations(this);

    // ── Players ───────────────────────────────────────────────────────────────
    const md      = this.matchData;
    const isP1    = md.role === "p1";
    const spawnY  = groundY - 220;
    const localX  = isP1 ? Math.floor(arenaW * 0.25) : Math.floor(arenaW * 0.75);
    const remoteX = isP1 ? Math.floor(arenaW * 0.75) : Math.floor(arenaW * 0.25);

    // Same Player class used in every overworld scene
    this.localPlayer = new Player(this, localX, spawnY);
    this.localPlayer.setFlipX(isP1 ? true : false);

    // Same RemotePlayer class used in every overworld scene
    this.remotePlayer = new RemotePlayer(this, {
      x:             remoteX,
      y:             spawnY,
      flipX:         isP1 ? false : true,
      anim:          "idle",
      gender:        md.opponent?.gender        ?? "Male",
      customization: md.opponent?.customization ?? {},
    });

    // Weapon layers — added on top of character layers for PvP only
    const myWpnKey = getWeaponTextureKey(
      gameState.gender,
      gameState.customization?.weaponTier ?? 0,
      gameState.customization?.weaponType ?? 0,
    );
    this.localPlayer.addWeaponLayer(myWpnKey);

    const opCustom = md.opponent?.customization;
    const opGender = md.opponent?.gender ?? "Male";
    if (opCustom) {
      const opWpnKey = getWeaponTextureKey(opGender, opCustom.weaponTier ?? 0, opCustom.weaponType ?? 0);
      this.remotePlayer.addWeaponLayer(opWpnKey);
    }

    // ── Attack / teleport state ───────────────────────────────────────────────
    this._attackKey         = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this._spaceKey          = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._matchStarted      = false;
    this._countdownStarted  = false;
    this._isAttacking       = false;
    this._hitEmitted        = false;
    this._lastAttackTime    = 0;
    this._lastTeleportTime  = 0;
    this._isDead            = false;
    this._isWinner          = false;
    this._remoteIsDead      = false;
    this._stamina           = MAX_STAMINA;
    this._lastStaminaAction = -ST_REGEN_DELAY;

    // ── Emoji picker (Q key) ──────────────────────────────────────────────────
    this._emojiPicker = new EmojiPicker(this, this.localPlayer, "PvPArena");

    // ── Teleport click listener ───────────────────────────────────────────────
    this.input.on("pointerdown", (pointer) => {
      if (
        this._matchStarted &&
        !this._isAttacking &&
        !this._isDead &&
        !this._isWinner &&
        !this._matchOver &&
        this._spaceKey.isDown &&
        this._stamina >= TELEPORT_ST_COST &&
        this.time.now - this._lastTeleportTime > TELEPORT_COOL
      ) {
        this._teleport(pointer.worldX);
      }
    });

    // ── Physics ───────────────────────────────────────────────────────────────
    this.physics.add.collider(this.localPlayer, this.groundGroup);

    // Sword hitbox — zone enabled only on the contact frame of pvpAttack
    this.swordHitbox = this.add.zone(localX, spawnY, 70, 16);
    this.physics.add.existing(this.swordHitbox);
    this.swordHitbox.body.allowGravity = false;
    this.swordHitbox.body.immovable    = true;
    this.swordHitbox.body.enable       = false;

    // Remote body hitbox — zone that follows the remote player for hit detection
    this.remoteBodyHitbox = this.add.zone(remoteX, spawnY, 14, 44);
    this.physics.add.existing(this.remoteBodyHitbox);
    this.remoteBodyHitbox.body.allowGravity = false;
    this.remoteBodyHitbox.body.immovable    = true;

    this.physics.add.overlap(
      this.swordHitbox,
      this.remoteBodyHitbox,
      () => {
        if (!this._matchOver && !this._hitEmitted) {
          this._hitEmitted = true;
          socket.emit("pvpHit", { matchId: md.matchId });
        }
      },
    );

    // ── HUD ───────────────────────────────────────────────────────────────────
    this._createHUD(arenaW);
    this._createNameTags(arenaW, isP1, md);

    // ── Floating name tags above sprites ──────────────────────────────────────
    // Render at 2× font size then scale to 0.5 — produces crisp text under the 2× camera zoom
    const tagStyle = { fontFamily: "Georgia", fontSize: "16px", color: "#ffffff", fontStyle: "bold" };
    const myName   = gameState.username ?? "You";
    const opName   = md.opponent?.username ?? "Opponent";

    this._localTagBounce  = 0;
    this._remoteTagBounce = 0;

    this._localTag  = this.add.text(localX,  spawnY - 21, myName, tagStyle).setOrigin(0.5, 1).setScale(0.5).setDepth(8);
    this._remoteTag = this.add.text(remoteX, spawnY - 21, opName, tagStyle).setOrigin(0.5, 1).setScale(0.5).setDepth(8);

    // ── Hide overworld HUD ────────────────────────────────────────────────────
    const uiScene = this.scene.get("UIScene");
    if (uiScene?.setOverworldHudVisible) uiScene.setOverworldHudVisible(false);

    this.events.once("shutdown", () => {
      const ui = this.scene.get("UIScene");
      if (ui?.setOverworldHudVisible) ui.setOverworldHudVisible(true);
    });

    // ── Socket ────────────────────────────────────────────────────────────────
    this._setupSocketListeners(isP1);

    // ── Teleport particle texture (generated, no asset needed) ───────────────
    if (!this.textures.exists("tpParticle")) {
      const g = this.add.graphics();
      g.fillStyle(0xcc88ff, 1);
      g.fillCircle(5, 5, 5);
      g.generateTexture("tpParticle", 10, 10);
      g.destroy();
    }

    this._groundY      = groundY;
    this.transitioning = false;
    this._matchOver    = false;
    this._lastEmit     = 0;
    this._localHp      = 100;
    this._remoteHp     = 100;

    // Tell server this player is ready — countdown starts when both arrive
    socket.emit("pvpArenaReady", { matchId: md.matchId });
  }

  update(time, delta) {
    if (!this.localPlayer) return;

    // ── Stamina regen (after 1s of no action) ────────────────────────────────
    if (time - this._lastStaminaAction > ST_REGEN_DELAY && this._stamina < MAX_STAMINA) {
      this._stamina = Math.min(MAX_STAMINA, this._stamina + ST_REGEN_RATE * (delta / 1000));
      this._updateStaminaBars();
    }

    // ── Attack input ──────────────────────────────────────────────────────────
    if (
      this._matchStarted &&
      !this._isAttacking && !this._isDead && !this._isWinner && !this._matchOver &&
      this.localPlayer.body.blocked.down &&
      this._stamina >= ATTACK_ST_COST &&
      Phaser.Input.Keyboard.JustDown(this._attackKey) &&
      time - this._lastAttackTime > ATTACK_COOL
    ) {
      this._startAttack(time);
    }

    // ── Sword hitbox — enabled only on the contact frame of the attack animation ─
    if (this._isAttacking) {
      const frame = this.localPlayer.anims.currentFrame?.textureFrame ?? -1;
      this.swordHitbox.body.enable = (frame === SWORD_FRAME);
    } else {
      this.swordHitbox.body.enable = false;
    }

    // ── Local player movement — same Player.update() as overworld ─────────────
    if (this._matchStarted && !this._isAttacking && !this._isDead && !this._isWinner) {
      this.localPlayer.update();
    }

    // ── Emoji picker ──────────────────────────────────────────────────────────
    this._emojiPicker?.update();

    // ── Remote player lerp — same RemotePlayer.update() as overworld ──────────
    this.remotePlayer.update(delta);

    // ── Floating name tags follow sprites ─────────────────────────────────────
    const lx = Math.round(this.localPlayer.x);
    const ly = Math.round(this.localPlayer.y);
    const rx = Math.round(this.remotePlayer.x);
    const ry = Math.round(this.remotePlayer.y);

    this._localTag.setPosition(lx,  ly - 21 + this._localTagBounce);
    this._remoteTag.setPosition(rx, ry - 21 + this._remoteTagBounce);

    // ── Sync hitbox positions ─────────────────────────────────────────────────
    this._syncHitboxes();

    // ── Emit position at 20 Hz ───────────────────────────────────────────────
    if (time - this._lastEmit > 50 && !this._matchOver) {
      this._lastEmit = time;
      socket.emit("pvpArenaMove", {
        matchId:   this.matchData.matchId,
        x:         this.localPlayer.x,
        y:         this.localPlayer.y,
        flipX:     this.localPlayer.flipX,
        anim:      this.localPlayer._baseAnim ?? "idle",
        stamina:   this._stamina,
      });
    }
  }

  _startAttack(time) {
    this._isAttacking    = true;
    this._hitEmitted     = false;
    this._lastAttackTime = time;

    this._stamina -= ATTACK_ST_COST;
    this._lastStaminaAction = time;
    this._updateStaminaBars();

    this.tweens.add({
      targets: this, _localTagBounce: -10,
      duration: 130, ease: "Sine.easeOut",
      yoyo: true, onComplete: () => { this._localTagBounce = 0; },
    });

    this.localPlayer.body.setVelocityX(0);
    this.localPlayer.playAnimation("attack");

    this.localPlayer.once("animationcomplete", () => {
      if (!this._isAttacking) return;
      this._isAttacking = false;
      this._hitEmitted  = false;
      if (!this._isDead) this.localPlayer.playAnimation("idle");
    });
  }

  _teleport(worldX) {
    const arenaW   = this.physics.world.bounds.width;
    const clampedX = Phaser.Math.Clamp(worldX, 20, arenaW - 20);
    const targetY  = this._groundY - 150;

    this._lastTeleportTime  = this.time.now;
    this._stamina          -= TELEPORT_ST_COST;
    this._lastStaminaAction = this.time.now;
    this._updateStaminaBars();

    this._spawnTeleportEffect(this.localPlayer.x, this.localPlayer.y);
    this.localPlayer.setAlpha(0);

    this.time.delayedCall(80, () => {
      this.localPlayer.setPosition(clampedX, targetY);
      this.localPlayer.body.setVelocityX(0);
      this.localPlayer.body.setVelocityY(0);
      this.localPlayer.playAnimation("idle");
      this._spawnTeleportEffect(clampedX, targetY);
      this.tweens.add({
        targets: this.localPlayer,
        alpha: 1,
        duration: 120,
        ease: "Power2.easeOut",
      });
    });
  }

  _spawnTeleportEffect(x, y) {
    // Expanding ring
    const ring = this.add.graphics().setDepth(10).setPosition(x, y);
    ring.lineStyle(2, 0xcc44ff, 1);
    ring.strokeCircle(0, 0, 8);
    this.tweens.add({
      targets: ring,
      scaleX: 6, scaleY: 6,
      alpha: 0,
      duration: 380,
      ease: "Power2.easeOut",
      onComplete: () => ring.destroy(),
    });

    // Particle burst
    const emitter = this.add.particles(x, y, "tpParticle", {
      speed:    { min: 30, max: 110 },
      scale:    { start: 0.9, end: 0 },
      alpha:    { start: 1,   end: 0 },
      lifespan: 380,
      quantity: 14,
      angle:    { min: 0, max: 360 },
      gravityY: 60,
    });
    emitter.setDepth(10);
    emitter.explode();
    this.time.delayedCall(500, () => emitter.destroy());
  }

  _syncHitboxes() {
    const dir = this.localPlayer.flipX ? 1 : -1;
    this.swordHitbox.body.reset(
      Math.round(this.localPlayer.x) + dir * 35,
      Math.round(this.localPlayer.y) - 6,
    );
    this.remoteBodyHitbox.body.reset(
      Math.round(this.remotePlayer.x),
      Math.round(this.remotePlayer.y),
    );
  }

  // ── Countdown + FIGHT! ────────────────────────────────────────────────────────
  _startCountdown() {
    const cx = Math.floor(this.scale.width  / CAMERA_ZOOM / 2);
    const cy = Math.floor(this.scale.height / CAMERA_ZOOM / 2);

    const numStyle = {
      fontFamily: "Georgia", fontSize: "200px", fontStyle: "bold",
      color: "#ffffff", stroke: "#111111", strokeThickness: 18,
    };

    let count = 3;
    const txt = this.add.text(cx, cy, "3", numStyle)
      .setOrigin(0.5).setDepth(70).setScale(0.5);

    const tick = () => {
      txt.setText(String(count));
      txt.setScale(0.7);
      this.tweens.add({
        targets: txt, scaleX: 0.5, scaleY: 0.5,
        duration: 800, ease: "Power2.easeIn",
      });
      count--;
      if (count > 0) {
        this.time.delayedCall(1000, tick);
      } else {
        this.time.delayedCall(1000, () => {
          txt.destroy();
          const fight = this.add.text(cx, cy, "FIGHT!", {
            fontFamily: "Georgia", fontSize: "180px", fontStyle: "bold",
            color: "#ffe066", stroke: "#8b4900", strokeThickness: 16,
          }).setOrigin(0.5).setDepth(70).setScale(0.35);
          this.tweens.add({
            targets: fight, scaleX: 0.5, scaleY: 0.5,
            duration: 250, ease: "Back.easeOut",
          });

          // FIGHT! sound → PvP song starts when it ends
          if (this.cache.audio.has("fight_sound")) {
            const fightSfx = this.sound.add("fight_sound", { loop: false, volume: 0.9 });
            fightSfx.play();
            fightSfx.once("complete", () => {
              if (!this._matchOver && this.cache.audio.has("pvp_song")) {
                this._pvpMusic = this.sound.add("pvp_song", { loop: true, volume: 0.5 });
                this._pvpMusic.play();
              }
            });
          }

          this.time.delayedCall(1500, () => {
            fight.destroy();
            this._matchStarted = true;
          });
        });
      }
    };
    tick();
  }

  // ── KO! splash ────────────────────────────────────────────────────────────────
  _showKO() {
    // Stop PvP music and play KO sound
    this._pvpMusic?.stop();
    this._pvpMusic = null;
    if (this.cache.audio.has("ko_sound")) {
      this.sound.add("ko_sound", { loop: false, volume: 0.9 }).play();
    }

    const cx = Math.floor(this.scale.width  / CAMERA_ZOOM / 2);
    const cy = Math.floor(this.scale.height / CAMERA_ZOOM / 2);
    const ko = this.add.text(cx, cy, "KO!", {
      fontFamily: "Georgia", fontSize: "240px", fontStyle: "bold",
      color: "#ff2200", stroke: "#000000", strokeThickness: 22,
    }).setOrigin(0.5).setDepth(75).setScale(0.7);
    this.tweens.add({
      targets: ko, scaleX: 0.5, scaleY: 0.5,
      duration: 400, ease: "Back.easeIn",
    });
    this.time.delayedCall(2000, () => { ko.destroy(); });
  }

  // ── HP bar shake ─────────────────────────────────────────────────────────────
  _shakeHpBar(bar) {
    if (!bar) return;
    const origX = bar.x;
    this.tweens.add({
      targets: bar, x: origX + 6,
      duration: 40, yoyo: true, repeat: 4, ease: "Linear",
      onComplete: () => { bar.x = origX; },
    });
  }

  // ── Background ────────────────────────────────────────────────────────────────
  _buildBackground(W, H) {
    const groundY = H - 48;
    this.add.rectangle(0, 0, W, H, 0x87c9e8).setOrigin(0, 0);

    const mountW = this.textures.get("grassy_mountains").getSourceImage().width;
    for (let x = 0; x < W; x += mountW) {
      this.add.image(x, groundY - 30, "grassy_mountains").setOrigin(0, 1);
    }
    const cloudMidW = this.textures.get("clouds_mid").getSourceImage().width;
    for (let x = 0; x < W; x += cloudMidW) {
      this.add.image(x, groundY - 10, "clouds_mid").setOrigin(0, 1);
    }
    this.add.image(Math.floor(W * 0.1),  groundY - 10, "hill").setOrigin(0, 1).setScale(0.5);
    this.add.image(Math.floor(W * 0.55), groundY - 10, "hill").setOrigin(0, 1).setScale(0.55).setFlipX(true);
    const cloudFrontW = this.textures.get("clouds_front").getSourceImage().width;
    for (let x = 0; x < W; x += cloudFrontW) {
      this.add.image(x, groundY, "clouds_front").setOrigin(0, 1);
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────
  // All five sprites per player share the same (x, barTop) origin.
  // HeartSpriteSheet is the top-most layer; it has transparent slots where the
  // bars show through, so the bars appear visually "inside" the heart frame.
  // P2's entire widget is mirrored with setFlipX so the heart sits on the right.
  _createHUD(arenaW) {
    const pad     = 8;
    const barTop  = 28;                  // 20px lower than original 8
    const scaledW = BAR_W * HUD_SCALE;  // 135 world units
    const scaledH = BAR_H * HUD_SCALE;  // 42 world units

    // ── P1 (left) ─────────────────────────────────────────────────────────────
    this.add.image(pad, barTop, "pvpHpEmpty").setOrigin(0, 0).setDepth(50).setScale(HUD_SCALE);
    this.add.image(pad, barTop, "pvpStEmpty").setOrigin(0, 0).setDepth(50).setScale(HUD_SCALE);
    this._p1HpFull = this.add.image(pad, barTop, "pvpHpFull").setOrigin(0, 0).setDepth(51).setScale(HUD_SCALE);
    this._p1StFull = this.add.image(pad, barTop, "pvpStFull").setOrigin(0, 0).setDepth(51).setScale(HUD_SCALE);
    this.add.sprite(pad, barTop, "pvpHeart").setOrigin(0, 0).setDepth(52).setScale(HUD_SCALE).play("pvpHeart");

    // ── P2 (right) — mirrored so heart sits on the right side ─────────────────
    const p2x = arenaW - pad - scaledW;
    this.add.image(p2x, barTop, "pvpHpEmpty").setOrigin(0, 0).setDepth(50).setScale(HUD_SCALE).setFlipX(true);
    this.add.image(p2x, barTop, "pvpStEmpty").setOrigin(0, 0).setDepth(50).setScale(HUD_SCALE).setFlipX(true);
    this._p2HpFull = this.add.image(p2x, barTop, "pvpHpFull").setOrigin(0, 0).setDepth(51).setScale(HUD_SCALE).setFlipX(true);
    this._p2StFull = this.add.image(p2x, barTop, "pvpStFull").setOrigin(0, 0).setDepth(51).setScale(HUD_SCALE).setFlipX(true);
    this.add.sprite(p2x, barTop, "pvpHeart").setOrigin(0, 0).setDepth(52).setScale(HUD_SCALE).setFlipX(true).play("pvpHeart");

    // VS text centred between the two HUDs
    this.add.text(arenaW / 2, barTop + scaledH / 2, "VS", {
      fontFamily: "Georgia", fontSize: "20px", color: "#ffe066", fontStyle: "bold",
    }).setOrigin(0.5).setScale(0.5).setDepth(53);

    this._hudBarTop = barTop;
  }

  _updateHUD() {
    const isP1 = this.matchData.role === "p1";
    const p1hp = isP1 ? this._localHp  : this._remoteHp;
    const p2hp = isP1 ? this._remoteHp : this._localHp;
    // Crop starts at HEART_OPAQUE_W so the bar only reaches truly empty at HP=0.
    // Without this offset, the bar disappears under the heart icon at ~31% HP,
    // letting one extra hit slip through before the death trigger arrives.
    this._p1HpFull.setCrop(0, 0, HEART_OPAQUE_W + BAR_CONTENT_W * (p1hp / 100), BAR_H);
    this._p2HpFull.setCrop(0, 0, HEART_OPAQUE_W + BAR_CONTENT_W * (p2hp / 100), BAR_H);
  }

  _updateStaminaBars() {
    const ratio = Math.max(0, this._stamina / MAX_STAMINA);
    const isP1  = this.matchData.role === "p1";
    const bar   = isP1 ? this._p1StFull : this._p2StFull;
    // Same offset fix: bar becomes invisible at ratio=0, not at ratio≈0.31
    if (bar) bar.setCrop(0, 0, HEART_OPAQUE_W + BAR_CONTENT_W * ratio, BAR_H);
  }

  // ── Name tags — centred above each HUD widget ──────────────────────────────────
  _createNameTags(arenaW, isP1, md) {
    const myName  = gameState.username ?? "You";
    const opName  = md.opponent?.username ?? "Opponent";
    const style   = { fontFamily: "Georgia", fontSize: "16px", color: "#ffffff", fontStyle: "bold" };
    const pad     = 8;
    const scaledW = BAR_W * HUD_SCALE;
    const p1CX    = pad + scaledW / 2;          // centre of scaled P1 HUD widget
    const p2CX    = arenaW - pad - scaledW / 2; // centre of scaled P2 HUD widget
    const nameY   = 26;                          // 20px lower, just above barTop=28

    this.add.text(p1CX, nameY, isP1 ? myName : opName, style)
      .setOrigin(0.5, 1).setScale(0.5).setDepth(53);
    this.add.text(p2CX, nameY, isP1 ? opName : myName, style)
      .setOrigin(0.5, 1).setScale(0.5).setDepth(53);
  }

  // ── Socket ────────────────────────────────────────────────────────────────────
  _setupSocketListeners(isP1) {
    this._onArenaMove = (data) => {
      // First move from opponent confirms both players are in the arena → start countdown
      if (!this._countdownStarted) {
        this._countdownStarted = true;
        this._startCountdown();
      }

      this.remotePlayer.targetX = data.x;
      this.remotePlayer.targetY = data.y;
      this.remotePlayer.setFlipX(data.flipX ?? true);

      // Sync remote stamina bar
      if (data.stamina !== undefined) {
        const ratio     = Math.max(0, data.stamina / MAX_STAMINA);
        const remoteBar = isP1 ? this._p2StFull : this._p1StFull;
        if (remoteBar) remoteBar.setCrop(0, 0, HEART_OPAQUE_W + BAR_CONTENT_W * ratio, BAR_H);
      }

      // Bounce remote name tag on attack start
      if (data.anim === "attack" && this.remotePlayer.anims.currentAnim?.key.endsWith("_attack") === false) {
        this.tweens.add({
          targets: this, _remoteTagBounce: -10,
          duration: 130, ease: "Sine.easeOut",
          yoyo: true, onComplete: () => { this._remoteTagBounce = 0; },
        });
      }

      if (data.anim && !this._remoteIsDead) {
        this.remotePlayer._playAnim(data.anim);
      }
    };

    this._onHpUpdate = (data) => {
      const prevLocal  = this._localHp;
      const prevRemote = this._remoteHp;
      this._localHp  = isP1 ? data.p1hp : data.p2hp;
      this._remoteHp = isP1 ? data.p2hp : data.p1hp;
      this._updateHUD();
      if (this._localHp  < prevLocal)  this._shakeHpBar(isP1 ? this._p1HpFull : this._p2HpFull);
      if (this._remoteHp < prevRemote) this._shakeHpBar(isP1 ? this._p2HpFull : this._p1HpFull);
    };

    this._onResult = async (data) => {
      if (this._matchOver) return;
      this._matchOver = true;

      const iWon  = (isP1 && data.winner === "p1") || (!isP1 && data.winner === "p2");
      const prize = (data.betAmount ?? 0) * 2;

      // Play end animations immediately
      this.localPlayer.body.setVelocityX(0);
      if (iWon) {
        this._isWinner     = true;
        this._remoteIsDead = true;
        this.localPlayer.playAnimation("idle");
        this.remotePlayer._playAnim("death");
      } else {
        this._isDead = true;
        this.localPlayer.playAnimation("death");
        this.remotePlayer._playAnim("idle");
      }

      // Show KO! for 2 seconds, then show end screen
      this._showKO();
      this.time.delayedCall(2000, () => {
        if (iWon) {
          const title = data.disconnected ? "OPPONENT LEFT — WIN!" : "⚔  YOU WIN!";
          this._goldStatusText = prize > 0
            ? this._showEndScreen(title, "#ffe066", "Gold transferring…")
            : this._showEndScreen(title, "#ffe066");
        } else {
          this._showEndScreen("✝  YOU LOSE", "#ff6666");
        }
      });
    };

    this._onAbort = () => {
      if (this._matchOver) return;
      this._matchOver = true;
      this._isWinner = true;
      this.localPlayer.body.setVelocityX(0);
      this.localPlayer.playAnimation("idle");
      this._showEndScreen("OPPONENT DISCONNECTED", "#aaaaaa");
    };

    this._onPaid = async ({ amount }) => {
      this._goldStatusText?.setText(`+${amount} Gold received!`);
      try {
        const bal = await getGoldBalance(gameState.walletAddress);
        gameState.gold = bal;
        gameState._emit();
      } catch { /* balance will refresh on next scene load */ }
    };

    this._onPlayerEmoji = ({ scene, emoji }) => {
      if (scene === "PvPArena") this.remotePlayer.showEmoji(emoji);
    };

    socket.on("pvpArenaMove", this._onArenaMove);
    socket.on("pvpHpUpdate",  this._onHpUpdate);
    socket.on("pvpResult",    this._onResult);
    socket.on("pvpAbort",     this._onAbort);
    socket.on("pvpPaid",      this._onPaid);
    socket.on("playerEmoji",  this._onPlayerEmoji);

    this.events.once("shutdown", () => {
      socket.off("pvpArenaMove", this._onArenaMove);
      socket.off("pvpHpUpdate",  this._onHpUpdate);
      socket.off("pvpResult",    this._onResult);
      socket.off("pvpAbort",     this._onAbort);
      socket.off("pvpPaid",      this._onPaid);
      socket.off("playerEmoji",  this._onPlayerEmoji);
    });
  }

  // ── End screen ────────────────────────────────────────────────────────────────
  // Returns the subtitle text object (if subtitle provided) so caller can update it live.
  _showEndScreen(message, color, subtitle = null) {
    const cx    = Math.floor(this.scale.width  / CAMERA_ZOOM / 2);
    const cy    = Math.floor(this.scale.height / CAMERA_ZOOM / 2);
    const hasSub = subtitle !== null;

    this.add.rectangle(cx, cy - 10, 180, hasSub ? 44 : 26, 0x000000, 0.72).setDepth(60);
    this.add.text(cx, cy - (hasSub ? 18 : 10), message, {
      fontFamily: "Georgia", fontSize: "13px", color, fontStyle: "bold",
    }).setOrigin(0.5).setDepth(61);

    let subText = null;
    if (hasSub) {
      subText = this.add.text(cx, cy - 4, subtitle, {
        fontFamily: "Georgia", fontSize: "9px", color: "#ffffff",
      }).setOrigin(0.5).setDepth(61);
    }

    const btnY  = cy + (hasSub ? 18 : 10);
    const btnBg = this.add.rectangle(cx, btnY, 90, 18, 0x8b6914)
      .setDepth(60).setInteractive({ useHandCursor: true });
    this.add.text(cx, btnY, "GO  BACK", {
      fontFamily: "Georgia", fontSize: "9px", color: "#ffe0a0", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(61);

    btnBg.on("pointerover",  () => btnBg.setFillStyle(0xc8960a));
    btnBg.on("pointerout",   () => btnBg.setFillStyle(0x8b6914));
    btnBg.on("pointerdown",  () => this._goBack());

    return subText;
  }

  // ── Return to overworld ───────────────────────────────────────────────────────
  _goBack() {
    if (this.transitioning) return;
    this.transitioning = true;
    socket.emit("pvpLeave", { matchId: this.matchData?.matchId });
    const returnScene  = this.matchData?.returnScene     ?? "StarterAreaScene";
    const returnLoader = this.matchData?.returnLoaderKey ?? "world";
    gameState.pendingPvP = null;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.sound.stopAll();
      this.scene.start("LoadingScene", {
        nextScene: returnScene,
        loaderKey: returnLoader,
        spawnSide: "left",
        spawnX:    gameState.lastX,
        spawnY:    gameState.lastY,
      });
    });
  }
}
