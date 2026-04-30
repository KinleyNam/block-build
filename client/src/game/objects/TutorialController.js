import Phaser from "phaser";

const GODDESS_SPEED  = 90;   // world px/s
const WALK1_DISTANCE = 1000; // px the goddess walks in phase 1

const LORE_SEGMENTS = [
    { distance: 400, line: "This world was once whole — a great realm of light called Aethon." },
    { distance: 400, line: "But the Shattering tore it apart. Five kingdoms fell to ruin in a single night." },
    { distance: 400, line: "Now only fragments remain, and those who claim them shape what comes next." },
    { distance: 300, line: "You are a claimant. What you build here will echo through the ages." },
];

const STEP_APPROACH    = 1; // goddess walks toward player
const STEP_INTRO       = 2; // intro dialogue — waiting for player to dismiss
const STEP_REPOSITION  = 3; // goddess walks from player's left to player's right
const STEP_WALK1       = 4; // goddess + player auto-walk ~1000 px
const STEP_INTERACT    = 5; // E-key teaching — player free but capped at goddess
const STEP_LORE_WALK   = 6; // goddess leads to next segment target
const STEP_LORE_PAUSE  = 7; // lore line shown — player free but capped at goddess
const STEP_DONE        = 8; // goddess exits, player fully free

export default class TutorialController {
    constructor(scene, player, groundY) {
        this.scene       = scene;
        this.player      = player;
        this.groundY     = groundY;
        this.step        = 0;
        this.goddess     = null;
        this._ePrompt    = null;
        this._walkTarget = 0;
        this._dialogOpen = false;
        this._loreIndex  = 0;
        this._eKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    /** StarterAreaScene checks this each frame to decide whether to lock player input. */
    get inputLocked() {
        if (this.step === STEP_INTERACT || this.step === STEP_LORE_PAUSE) return false;
        return this.step > 0 && this.step < STEP_DONE;
    }

    start() {
        this._spawnGoddess();
        this._spawnEPrompt();
        this.step        = STEP_APPROACH;
        this._walkTarget = this.player.x - 65;
    }

    _ui() { return this.scene.scene.get("UIScene"); }

    _spawnGoddess() {
        if (!this.scene.anims.exists("goddess-walk")) {
            this.scene.anims.create({
                key:       "goddess-walk",
                frames:    this.scene.anims.generateFrameNumbers("goddessWalk", { start: 0, end: 7 }),
                frameRate: 8,
                repeat:    -1,
            });
        }

        this.goddess = this.scene.add.sprite(-200, this.groundY, "goddessWalk")
            .setOrigin(0.5, 1)
            .setScale(1.75)
            .setDepth(4)
            .setFlipX(true);

        this.goddess.play("goddess-walk");
    }

    _spawnEPrompt() {
        this._ePrompt = this.scene.add.image(0, 0, "eKeyPrompt")
            .setScale(1)
            .setDepth(10)
            .setVisible(false);
    }

    _showEPrompt() {
        if (!this._ePrompt || !this.goddess) return;
        const bob = Math.sin(this.scene.time.now / 250) * 3;
        this._ePrompt
            .setVisible(true)
            .setPosition(this.goddess.x, this.goddess.y - this.goddess.displayHeight - 8 + bob);
    }

    _hideEPrompt() {
        this._ePrompt?.setVisible(false);
    }

    _capPlayerAtGoddess() {
        if (!this.goddess) return;
        const cap = this.goddess.x - 40;
        if (this.player.x > cap) {
            this.player.x = cap;
            if (this.player.body.velocity.x > 0) {
                this.player.body.velocity.x = 0;
            }
        }
    }

    _showDialogue(lines, onClose) {
        this._dialogOpen = true;
        this._ui()?.showDialogue("Mira", lines, () => {
            this._dialogOpen = false;
            if (onClose) onClose();
        });
    }

    // ─── main update — called every frame by StarterAreaScene ────

    update(time, delta) {
        if (this.step === 0) return;

        const dt = delta / 1000;

        if (this.step === STEP_DONE) {
            if (this.goddess) {
                this.goddess.x += GODDESS_SPEED * dt;
                if (this.goddess.x > this.scene.physics.world.bounds.right + 200) {
                    this.goddess.destroy();
                    this.goddess = null;
                }
            }
            return;
        }

        if (this._dialogOpen && Phaser.Input.Keyboard.JustDown(this._eKey)) {
            this._ui()?.advanceDialogue();
        } else if (
            this.step === STEP_INTERACT &&
            !this._dialogOpen &&
            this.goddess &&
            Math.abs(this.player.x - this.goddess.x) < 80 &&
            Phaser.Input.Keyboard.JustDown(this._eKey)
        ) {
            this._beginLoreWalk();
        }

        switch (this.step) {
            case STEP_APPROACH:   this._tickApproach(dt);    break;
            case STEP_REPOSITION: this._tickReposition(dt);  break;
            case STEP_WALK1:      this._tickWalk1(dt);       break;
            case STEP_LORE_WALK:  this._tickLoreWalk(dt);    break;
        }
    }

    /**
     * Called by StarterAreaScene AFTER player.update() so the position cap
     * always wins over whatever velocity the player just set.
     */
    postUpdate() {
        if (this.step === STEP_INTERACT || this.step === STEP_LORE_PAUSE) {
            this._showEPrompt();
            this._capPlayerAtGoddess();
        }
    }

    // ─── step tickers ────────────────────────────────────────────

    _tickApproach(dt) {
        if (this.goddess.x < this._walkTarget) {
            this.goddess.x += GODDESS_SPEED * dt;
        } else {
            this.goddess.anims.pause();
            this.player.setFlipX(false); // player faces left to look at goddess
            this.step = STEP_INTRO;
            this._showDialogue([
                "Welcome, traveler. I am Mira, guardian of this realm.",
                "Move with [ A ] and [ D ]. Hold Shift to run. Press [ W ] to jump.",
                "Now follow me — there is much of this world I must show you.",
            ], () => this._beginReposition());
        }
    }

    /** After intro dialogue: goddess walks from the player's left side to the right. */
    _beginReposition() {
        this._walkTarget = this.player.x + 70;
        this.step        = STEP_REPOSITION;
        this.goddess.anims.resume();
        this.goddess.setFlipX(true); // face right
    }

    _tickReposition(dt) {
        if (this.goddess.x < this._walkTarget) {
            this.goddess.x += GODDESS_SPEED * dt;
        } else {
            this._beginWalk1();
        }
    }

    /** Step WALK1 — goddess leads player right ~1000 px. */
    _beginWalk1() {
        // goddess is already at player.x + 70 from reposition
        this._walkTarget = this.goddess.x + WALK1_DISTANCE;
        this.step        = STEP_WALK1;
        // animation and facing already correct from _beginReposition
    }

    _tickWalk1(dt) {
        if (this.goddess.x < this._walkTarget) {
            this.goddess.x += GODDESS_SPEED * dt;
            this.player.body.setVelocityX(GODDESS_SPEED);
            this.player.setFlipX(true);
            this.player.playAnimation("walk");
        } else {
            this.goddess.anims.pause();
            this.player.body.setVelocityX(0);
            this.player.setFlipX(true);
            this.player.playAnimation("idle");
            this.step = STEP_INTERACT;
            this._showDialogue([
                "You can interact with NPCs and objects using the [ E ] key.",
                "Go ahead — press E to speak with me and continue our journey.",
            ], null); // dialogue closes; player must walk to goddess and press E to continue
        }
    }

    _beginLoreWalk() {
        this._loreIndex = 0;
        this._hideEPrompt();
        this._startNextLoreSegment();
    }

    _startNextLoreSegment() {
        if (this._loreIndex >= LORE_SEGMENTS.length) {
            this._complete();
            return;
        }
        const seg = LORE_SEGMENTS[this._loreIndex];
        // goddess stays where she is — no teleport
        this._walkTarget = this.goddess.x + seg.distance;
        this.step        = STEP_LORE_WALK;
        this.goddess.anims.resume();
        this.goddess.setFlipX(true);
    }

    _tickLoreWalk(dt) {
        if (this.goddess.x < this._walkTarget) {
            this.goddess.x += GODDESS_SPEED * dt;
            this.player.body.setVelocityX(GODDESS_SPEED);
            this.player.setFlipX(true);
            this.player.playAnimation("walk");
        } else {
            this.goddess.anims.pause();
            this.player.body.setVelocityX(0);
            this.player.playAnimation("idle");
            this.step = STEP_LORE_PAUSE;

            const seg = LORE_SEGMENTS[this._loreIndex];
            this._loreIndex++;
            this._showDialogue([seg.line], () => {
                this._hideEPrompt();
                this._startNextLoreSegment();
            });
        }
    }

    _complete() {
        this.step = STEP_DONE;
        this._hideEPrompt();
        this.player.body.setVelocityX(0);
        this.player.playAnimation("idle");
        this._ui()?.forceCloseDialogue();
        // resume walk animation so the goddess animates as she exits offscreen
        this.goddess?.anims.resume();
        this.goddess?.setFlipX(true);
    }
}
