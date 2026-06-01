import Phaser from "phaser";
import Player from "../objects/Player";
import RemotePlayer from "../objects/RemotePlayer";
import { createPvPAnimations } from "../assets";
import socket from "../socket";
import gameState from "../gameState";
import { getGoldBalance } from "../contractService";

const CAMERA_ZOOM    = 2;
const GROUND_OVERLAP = 1;
const ATTACK_COOL    = 700;
const SWORD_FRAME    = 4;
const SLIDE_SPEED    = 420;
const SLIDE_DURATION = 450;
const SLIDE_COOL     = 900;

const MAX_STAMINA       = 100;
const ATTACK_ST_COST    = 25;
const SLIDE_ST_COST     = 35;
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
    const spawnY  = groundY - 50;
    const localX  = isP1 ? Math.floor(arenaW * 0.25) : Math.floor(arenaW * 0.75);
    const remoteX = isP1 ? Math.floor(arenaW * 0.75) : Math.floor(arenaW * 0.25);

    // Same Player class used in every overworld scene
    this.localPlayer = new Player(this, localX, spawnY);
    this.localPlayer.setScale(2);
    this.localPlayer.setFlipX(isP1 ? true : false);

    // Same RemotePlayer class used in every overworld scene
    this.remotePlayer = new RemotePlayer(this, {
      x: remoteX, y: spawnY,
      flipX: isP1 ? false : true,
      anim: "idle",
    });
    this.remotePlayer.setScale(2);

    // Attack/slide visuals — separate non-physics sprites so frame-size changes
    // never affect the Player body or the RemotePlayer visual position
    this.attackSprite = this.add.sprite(localX, spawnY, "pvpAttack")
      .setScale(2).setDepth(6).setVisible(false);
    this.remoteAttackSprite = this.add.sprite(remoteX, spawnY, "pvpAttack")
      .setScale(2).setDepth(6).setVisible(false);
    this.slideSprite = this.add.sprite(localX, spawnY, "pvpSlide")
      .setScale(2).setDepth(6).setVisible(false);
    this.remoteSlideSprite = this.add.sprite(remoteX, spawnY, "pvpSlide")
      .setScale(2).setDepth(6).setVisible(false);

    // ── Attack state ──────────────────────────────────────────────────────────
    this._attackKey         = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this._slideKey          = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._isAttacking       = false;
    this._isSliding         = false;
    this._hitEmitted        = false;
    this._lastAttackTime    = 0;
    this._lastSlideTime     = 0;
    this._slideStartTime    = 0;
    this._isDead            = false;
    this._isWinner          = false;
    this._remoteIsDead      = false;
    this._remoteIsAttacking = false;
    this._remoteIsSliding   = false;
    this._stamina           = MAX_STAMINA;
    this._lastStaminaAction = -ST_REGEN_DELAY;

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
        if (!this._matchOver && !this._hitEmitted && !this._remoteIsSliding) {
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

    this._localTag  = this.add.text(localX,  spawnY - 56, myName, tagStyle).setOrigin(0.5, 1).setScale(0.5).setDepth(8);
    this._remoteTag = this.add.text(remoteX, spawnY - 56, opName, tagStyle).setOrigin(0.5, 1).setScale(0.5).setDepth(8);

    // ── Hide overworld HUD ────────────────────────────────────────────────────
    const uiScene = this.scene.get("UIScene");
    if (uiScene?.setOverworldHudVisible) uiScene.setOverworldHudVisible(false);

    this.events.once("shutdown", () => {
      const ui = this.scene.get("UIScene");
      if (ui?.setOverworldHudVisible) ui.setOverworldHudVisible(true);
    });

    // ── Socket ────────────────────────────────────────────────────────────────
    this._setupSocketListeners(isP1);

    this._groundY      = groundY;
    this.transitioning = false;
    this._matchOver    = false;
    this._lastEmit     = 0;
    this._localHp      = 100;
    this._remoteHp     = 100;
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
      !this._isAttacking && !this._isSliding && !this._isDead && !this._isWinner && !this._matchOver &&
      this.localPlayer.body.blocked.down &&
      this._stamina >= ATTACK_ST_COST &&
      Phaser.Input.Keyboard.JustDown(this._attackKey) &&
      time - this._lastAttackTime > ATTACK_COOL
    ) {
      this._startAttack(time);
    }

    // ── Sword hitbox — enabled only on the contact frame of attackSprite ──────
    if (this._isAttacking) {
      const frame = this.attackSprite.anims.currentFrame?.textureFrame ?? -1;
      this.swordHitbox.body.enable = (frame === SWORD_FRAME);
    } else {
      this.swordHitbox.body.enable = false;
    }

    // ── Slide input ───────────────────────────────────────────────────────────
    if (
      !this._isSliding && !this._isAttacking && !this._isDead && !this._isWinner && !this._matchOver &&
      this.localPlayer.body.blocked.down &&
      this._stamina >= SLIDE_ST_COST &&
      Phaser.Input.Keyboard.JustDown(this._slideKey) &&
      time - this._lastSlideTime > SLIDE_COOL
    ) {
      this._startSlide(time);
    }

    // ── End slide after duration ──────────────────────────────────────────────
    if (this._isSliding && time - this._slideStartTime >= SLIDE_DURATION) {
      this._endSlide();
    }

    // ── Track slide sprite X each frame; Y is fixed at ground level ───────────
    if (this._isSliding) {
      this.slideSprite.setPosition(this.localPlayer.x, this._groundY - 25);
    }

    // ── Local player movement — same Player.update() as overworld ─────────────
    if (!this._isAttacking && !this._isSliding && !this._isDead && !this._isWinner) {
      this.localPlayer.update();
    }

    // ── Remote player lerp — same RemotePlayer.update() as overworld ──────────
    this.remotePlayer.update(delta);

    // ── Track remote slide sprite — same offset logic as attack (-18 up / +20 down)
    if (this._remoteIsSliding) {
      this.remoteSlideSprite.setPosition(this.remotePlayer.x, this.remotePlayer.y + 20);
    }

    // ── Floating name tags + HP bar follow sprites ────────────────────────────
    const localRef  = this.attackSprite.visible ? this.attackSprite : this.localPlayer;
    const remoteRef = this.remoteAttackSprite.visible ? this.remoteAttackSprite : this.remotePlayer;
    const lx = Math.round(localRef.x);
    const ly = Math.round(localRef.y);
    const rx = Math.round(remoteRef.x);
    const ry = Math.round(remoteRef.y);

    this._localTag.setPosition(lx,  ly - 56 + this._localTagBounce);
    this._remoteTag.setPosition(rx, ry - 56 + this._remoteTagBounce);

    // ── Sync hitbox positions ─────────────────────────────────────────────────
    this._syncHitboxes();

    // ── Emit position at 20 Hz ───────────────────────────────────────────────
    if (time - this._lastEmit > 50 && !this._matchOver) {
      this._lastEmit = time;
      const anim = this._isAttacking ? "pvpAttack"
                 : this._isSliding   ? "pvpSlide"
                 : (this.localPlayer.anims.currentAnim?.key ?? "idle");
      socket.emit("pvpArenaMove", {
        matchId:     this.matchData.matchId,
        x:           this.localPlayer.x,
        y:           this.localPlayer.y,
        flipX:       this.localPlayer.flipX,
        anim,
        isAttacking: this._isAttacking,
        isSliding:   this._isSliding,
        stamina:     this._stamina,
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

    // Bounce local name tag up on attack
    this._localTagBounce = 0;
    this.tweens.add({
      targets: this, _localTagBounce: -10,
      duration: 130, ease: "Sine.easeOut",
      yoyo: true, onComplete: () => { this._localTagBounce = 0; },
    });

    // Freeze position at attack start — attackSprite stays here for the full swing.
    // Y offset -18: pvpAttack frame is 63px tall vs idle 45px; at scale 2 that's
    // 18 extra world-pixels below center, so shift up to keep feet at ground level.
    this._attackX = Math.round(this.localPlayer.x);
    this._attackY = Math.round(this.localPlayer.y) - 18;

    this.localPlayer.body.setVelocityX(0);
    this.localPlayer.setVisible(false);

    this.attackSprite.setPosition(this._attackX, this._attackY);
    this.attackSprite.setFlipX(this.localPlayer.flipX);
    this.attackSprite.setVisible(true);
    this.attackSprite.play("pvpAttack");

    this.attackSprite.once("animationcomplete-pvpAttack", () => {
      this._isAttacking = false;
      this._hitEmitted  = false;
      this.attackSprite.setVisible(false);
      if (!this._isDead) {
        this.localPlayer.setVisible(true);
        this.localPlayer.anims.play("idle", true);
      }
    });
  }

  _startSlide(time) {
    this._isSliding      = true;
    this._slideStartTime = time;
    this._lastSlideTime  = time;

    this._stamina -= SLIDE_ST_COST;
    this._lastStaminaAction = time;
    this._updateStaminaBars();

    const dir = this.localPlayer.flipX ? 1 : -1;
    this.localPlayer.body.setVelocityX(dir * SLIDE_SPEED);
    this.localPlayer.setVisible(false);

    this.slideSprite.setFlipX(this.localPlayer.flipX);
    this.slideSprite.setPosition(this.localPlayer.x, this._groundY - 25);
    this.slideSprite.setVisible(true);
    this.slideSprite.play("pvpSlide", true);
  }

  _endSlide() {
    this._isSliding = false;
    this.localPlayer.body.setVelocityX(0);
    this.slideSprite.setVisible(false);
    if (!this._isDead) {
      this.localPlayer.setVisible(true);
      this.localPlayer.anims.play("idle", true);
    }
  }

  _syncHitboxes() {
    // Sword hitbox uses frozen attack position during swing, live position otherwise
    if (this._isAttacking) {
      const dir = this.attackSprite.flipX ? 1 : -1;
      this.swordHitbox.body.reset(this._attackX + dir * 35, this._attackY - 6);
    } else {
      const dir = this.localPlayer.flipX ? 1 : -1;
      this.swordHitbox.body.reset(
        Math.round(this.localPlayer.x) + dir * 35,
        Math.round(this.localPlayer.y) - 6,
      );
    }
    this.remoteBodyHitbox.body.reset(
      Math.round(this.remotePlayer.x),
      Math.round(this.remotePlayer.y),
    );
  }

  // ── Background ────────────────────────────────────────────────────────────────
  _buildBackground(W, H) {
    const groundY = H - 48;
    this.add.rectangle(0, 0, W, H, 0x87c9e8).setOrigin(0, 0);

    const mountW = this.textures.get("grassy_mountains").getSourceImage().width;
    for (let x = 0; x < W; x += mountW) {
      this.add.image(x, groundY - 60, "grassy_mountains").setOrigin(0, 1);
    }
    const cloudMidW = this.textures.get("clouds_mid").getSourceImage().width;
    for (let x = 0; x < W; x += cloudMidW) {
      this.add.image(x, groundY - 40, "clouds_mid").setOrigin(0, 1);
    }
    this.add.image(Math.floor(W * 0.1),  groundY - 10, "hill").setOrigin(0, 1).setScale(0.5);
    this.add.image(Math.floor(W * 0.55), groundY - 10, "hill").setOrigin(0, 1).setScale(0.55).setFlipX(true);
    const cloudFrontW = this.textures.get("clouds_front").getSourceImage().width;
    for (let x = 0; x < W; x += cloudFrontW) {
      this.add.image(x, groundY - 25, "clouds_front").setOrigin(0, 1);
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
      this.remotePlayer.targetX = data.x;
      this.remotePlayer.targetY = data.y;
      this.remotePlayer.setFlipX(data.flipX ?? true);

      // Sync remote player's stamina bar
      if (data.stamina !== undefined) {
        const ratio    = Math.max(0, data.stamina / MAX_STAMINA);
        const remoteBar = isP1 ? this._p2StFull : this._p1StFull;
        if (remoteBar) remoteBar.setCrop(0, 0, HEART_OPAQUE_W + BAR_CONTENT_W * ratio, BAR_H);
      }

      if (data.isAttacking && !this._remoteIsAttacking) {
        this._remoteIsAttacking = true;
        // Bounce remote name tag up on attack
        this._remoteTagBounce = 0;
        this.tweens.add({
          targets: this, _remoteTagBounce: -10,
          duration: 130, ease: "Sine.easeOut",
          yoyo: true, onComplete: () => { this._remoteTagBounce = 0; },
        });
        const rx = Math.round(this.remotePlayer.x);
        const ry = Math.round(this.remotePlayer.y) - 18;
        this.remotePlayer.setVisible(false);
        this.remoteAttackSprite.setPosition(rx, ry);
        this.remoteAttackSprite.setFlipX(data.flipX ?? true);
        this.remoteAttackSprite.setVisible(true);
        this.remoteAttackSprite.play("pvpAttack");
        this.remoteAttackSprite.once("animationcomplete-pvpAttack", () => {
          this._remoteIsAttacking = false;
          this.remoteAttackSprite.setVisible(false);
          if (!this._remoteIsDead && !this._matchOver) {
            this.remotePlayer.setVisible(true);
            this.remotePlayer.anims.play("idle", true);
          }
        });
      } else if (data.isSliding && !this._remoteIsSliding && !this._remoteIsAttacking) {
        this._remoteIsSliding = true;
        this.remotePlayer.setVisible(false);
        this.remoteSlideSprite.setFlipX(data.flipX ?? true);
        this.remoteSlideSprite.setPosition(this.remotePlayer.x, this.remotePlayer.y + 20);
        this.remoteSlideSprite.setVisible(true);
        this.remoteSlideSprite.play("pvpSlide", true);
      } else if (!data.isSliding && this._remoteIsSliding) {
        this._remoteIsSliding = false;
        this.remoteSlideSprite.setVisible(false);
        if (!this._remoteIsDead && !this._matchOver) {
          this.remotePlayer.setVisible(true);
        }
      } else if (!data.isAttacking && !this._remoteIsAttacking && !this._remoteIsSliding && data.anim) {
        const curAnim = this.remotePlayer.anims.currentAnim?.key;
        if (curAnim !== data.anim) this.remotePlayer.anims.play(data.anim, true);
      }
    };

    this._onHpUpdate = (data) => {
      this._localHp  = isP1 ? data.p1hp : data.p2hp;
      this._remoteHp = isP1 ? data.p2hp : data.p1hp;
      this._updateHUD();
    };

    this._onResult = async (data) => {
      if (this._matchOver) return;
      this._matchOver = true;

      const iWon = (isP1 && data.winner === "p1") || (!isP1 && data.winner === "p2");
      const prize = (data.betAmount ?? 0) * 2;

      if (iWon) {
        this._isWinner     = true;
        this._remoteIsDead = true;
        this.localPlayer.body.setVelocityX(0);
        this.localPlayer.anims.play("idle", true);
        this.remotePlayer.anims.play("pvpDeath");

        const title = data.disconnected ? "OPPONENT LEFT — WIN!" : "⚔  YOU WIN!";
        // Server pays via escrow — show pending then update when pvpPaid arrives
        this._goldStatusText = prize > 0
          ? this._showEndScreen(title, "#ffe066", "Gold transferring…")
          : this._showEndScreen(title, "#ffe066");
      } else {
        this._isDead = true;
        this.localPlayer.body.setVelocityX(0);
        this.localPlayer.anims.play("pvpDeath");
        this.remotePlayer.anims.play("idle", true);
        this._showEndScreen("✝  YOU LOSE", "#ff6666");
      }
    };

    this._onAbort = () => {
      if (this._matchOver) return;
      this._matchOver = true;
      this._isWinner = true;
      this.localPlayer.body.setVelocityX(0);
      this.localPlayer.anims.play("idle", true);
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

    socket.on("pvpArenaMove", this._onArenaMove);
    socket.on("pvpHpUpdate",  this._onHpUpdate);
    socket.on("pvpResult",    this._onResult);
    socket.on("pvpAbort",     this._onAbort);
    socket.on("pvpPaid",      this._onPaid);

    this.events.once("shutdown", () => {
      socket.off("pvpArenaMove", this._onArenaMove);
      socket.off("pvpHpUpdate",  this._onHpUpdate);
      socket.off("pvpResult",    this._onResult);
      socket.off("pvpAbort",     this._onAbort);
      socket.off("pvpPaid",      this._onPaid);
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
