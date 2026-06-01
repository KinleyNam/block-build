import Phaser from "phaser";

const SPEED        = 200;
const JUMP_VEL     = -520;
const BODY_GRAVITY = 800;
const ATTACK_COOL  = 700;
const SWORD_FRAME  = 4;

export default class PvPPlayer {
  constructor(scene, x, y, options = {}) {
    this.scene       = scene;
    this.isLocal     = options.isLocal  ?? false;
    this.role        = options.role     ?? "p1";
    this.matchId     = options.matchId  ?? "";
    this.hp          = 100;
    this.isDead      = false;
    this.isWinner    = false;
    this.isAttacking = false;
    this._hitEmitted     = false;
    this._lastAttackTime = 0;

    // Movement sprite (physics body)
    this.sprite = scene.physics.add.sprite(x, y, "playerIdle")
      .setScale(2)
      .setDepth(5);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setGravityY(BODY_GRAVITY);
    this.sprite.body.setSize(12, 40);
    this.sprite.body.setOffset(3, 5);

    // Attack visual (hidden until attacking)
    this.attackSprite = scene.add.sprite(x, y, "pvpAttack")
      .setScale(2).setDepth(6).setVisible(false);

    // Death visual (hidden until dead)
    this.deathSprite = scene.add.sprite(x, y, "pvpDeath")
      .setScale(2).setDepth(6).setVisible(false);

    // Body hitbox (Zone for overlap detection)
    this.bodyHitbox = scene.add.zone(x, y, 14, 44);
    scene.physics.add.existing(this.bodyHitbox);
    this.bodyHitbox.body.allowGravity = false;
    this.bodyHitbox.body.immovable    = true;

    // Sword hitbox (disabled by default, active on sword frame)
    this.swordHitbox = scene.add.zone(x + 28, y - 6, 32, 16);
    scene.physics.add.existing(this.swordHitbox);
    this.swordHitbox.body.allowGravity = false;
    this.swordHitbox.body.immovable    = true;
    this.swordHitbox.body.enable       = false;

    // Initial facing — p1 faces right (flipX=true), p2 faces left (flipX=false)
    this.sprite.setFlipX(this.role === "p1");

    // Input (local player only)
    if (this.isLocal) {
      const kb = scene.input.keyboard;
      this.keys = {
        left:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        jump:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        attack: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      };
    }

    // Remote player: disable physics body — position is driven entirely by server
    // data + lerp. Gravity fighting the lerp is what causes the vibration.
    if (!this.isLocal) {
      this.sprite.body.enable = false;
    }

    // Target position for remote lerp — updated by updateFromServer each packet
    this._targetX = x;
    this._targetY = y;

    this.sprite.play("idle", true);
  }

  // Called every frame from PvPArena.update(time, delta)
  update(time, delta) {
    this._syncHitboxes();

    // Sword hitbox active only on the sword-contact animation frame
    if (this.isAttacking && this.attackSprite.visible) {
      const frame = this.attackSprite.anims.currentFrame?.textureFrame ?? -1;
      this.swordHitbox.body.enable = frame === SWORD_FRAME;
    } else {
      this.swordHitbox.body.enable = false;
    }

    if (this.isDead || this.isWinner) return;

    // ── Remote player: delta-time lerp toward last known server position ──────
    // Same algorithm as RemotePlayer.update(delta) — smooth and frame-rate independent
    if (!this.isLocal) {
      const dx = this._targetX - this.sprite.x;
      const dy = this._targetY - this.sprite.y;
      if (Math.abs(dx) > 300 || Math.abs(dy) > 300) {
        this.sprite.setPosition(this._targetX, this._targetY);
      } else {
        const t = Math.min(1, delta * 0.025);
        this.sprite.x += dx * t;
        this.sprite.y += dy * t;
      }
      return;
    }

    // ── Local player: direct physics input ────────────────────────────────────
    if (this.isAttacking) return;

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.attack) &&
      time - this._lastAttackTime > ATTACK_COOL
    ) {
      this._startAttack(time);
      return;
    }

    const body     = this.sprite.body;
    const onGround = body.blocked.down;

    if (this.keys.left.isDown) {
      body.setVelocityX(-SPEED);
      this.sprite.setFlipX(false);
    } else if (this.keys.right.isDown) {
      body.setVelocityX(SPEED);
      this.sprite.setFlipX(true);
    } else {
      body.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && onGround) {
      body.setVelocityY(JUMP_VEL);
    }

    if (!onGround) {
      if (body.velocity.y < 0) {
        this.sprite.play("jumpUp", true);
      } else if (this.sprite.anims.currentAnim?.key !== "jumpDown") {
        this.sprite.play("jumpDown", true);
      }
      return;
    }

    if (body.velocity.x !== 0) {
      this.sprite.play("walk", true);
    } else {
      this.sprite.play("idle", true);
    }
  }

  _startAttack(time) {
    this.isAttacking     = true;
    this._hitEmitted     = false;
    this._lastAttackTime = time;

    this.sprite.setVelocityX(0);
    this.sprite.setVisible(false);

    this.attackSprite.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y));
    this.attackSprite.setFlipX(this.sprite.flipX);
    this.attackSprite.setVisible(true);
    this.attackSprite.play("pvpAttack");

    this.attackSprite.once("animationcomplete-pvpAttack", () => {
      this.isAttacking = false;
      this._hitEmitted = false;
      this.attackSprite.setVisible(false);
      if (!this.isDead) {
        this.sprite.setVisible(true);
        this.sprite.play("idle", true);
      }
    });
  }

  _syncHitboxes() {
    const sx = Math.round(this.sprite.x);
    const sy = Math.round(this.sprite.y);

    this.bodyHitbox.body.reset(sx, sy);

    if (this.isAttacking && this.attackSprite.visible) {
      this.attackSprite.setPosition(sx, sy);
    }

    const flipRef = this.attackSprite.visible ? this.attackSprite : this.sprite;
    const dir     = flipRef.flipX ? 1 : -1;
    this.swordHitbox.body.reset(sx + dir * 32, sy - 6);
  }

  // Called when pvpArenaMove arrives (remote player only)
  updateFromServer(data) {
    if (this.isDead || this.isWinner) return;

    // Store target — lerp happens in update(delta) each frame, not here
    this._targetX = data.x;
    this._targetY = data.y;

    this.sprite.setFlipX(data.flipX ?? false);

    if (data.isAttacking && !this.isAttacking) {
      this.isAttacking = true;
      this.sprite.setVisible(false);

      this.attackSprite.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y));
      this.attackSprite.setFlipX(this.sprite.flipX);
      this.attackSprite.setVisible(true);
      this.attackSprite.play("pvpAttack");

      this.attackSprite.once("animationcomplete-pvpAttack", () => {
        this.isAttacking = false;
        this.attackSprite.setVisible(false);
        if (!this.isDead) {
          this.sprite.setVisible(true);
          this.sprite.play("idle", true);
        }
      });
    } else if (!data.isAttacking && !this.isAttacking) {
      const animKey = data.anim ?? "idle";
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey, true);
      }
    }
  }

  setHp(newHp) { this.hp = Math.max(0, newHp); }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.swordHitbox.body.enable = false;
    this.sprite.setVelocityX(0);
    this.sprite.setVisible(false);
    this.attackSprite.setVisible(false);
    this.deathSprite.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y));
    this.deathSprite.setFlipX(this.sprite.flipX);
    this.deathSprite.setVisible(true);
    this.deathSprite.play("pvpDeath");
    this._destroyKeys();
  }

  winIdle() {
    if (this.isWinner) return;
    this.isWinner = true;
    this.swordHitbox.body.enable = false;
    this.sprite.setVelocityX(0);
    this.attackSprite.setVisible(false);
    this.sprite.setVisible(true);
    this.sprite.play("idle", true);
    this._destroyKeys();
  }

  _destroyKeys() {
    if (this.keys) {
      Object.values(this.keys).forEach(k => k?.destroy());
      this.keys = null;
    }
  }

  get x()             { return this.sprite.x; }
  get y()             { return this.sprite.y; }
  get flipX()         { return this.attackSprite.visible ? this.attackSprite.flipX : this.sprite.flipX; }
  get displayHeight() { return this.sprite.displayHeight; }
  get currentAnim()   { return this.sprite.anims.currentAnim?.key ?? "idle"; }

  destroy() {
    this._destroyKeys();
    this.sprite?.destroy();
    this.attackSprite?.destroy();
    this.deathSprite?.destroy();
    this.bodyHitbox?.destroy();
    this.swordHitbox?.destroy();
  }
}
