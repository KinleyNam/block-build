import mountains from "../assets/backgrounds/mountains.png";
import farTrees from "../assets/backgrounds/far-trees.png";
import midTrees from "../assets/backgrounds/mid-trees.png";
import frontTrees from "../assets/backgrounds/Front-trees.png";
import castle from "../assets/backgrounds/Castle.png";

import ground from "../assets/platforms/ground.png";

import statue from "../assets/props/statue.png";
import bigRock from "../assets/props/big-rock.png";
import mediumRock from "../assets/props/medium-rock.png";
import bigBush from "../assets/props/big-bush.png";
import midBush from "../assets/props/mid-bush.png";
import smallBush from "../assets/props/small-bush.png";
import tree from "../assets/props/tree.png";
import brich from "../assets/props/Birch1.png";

import playerIdle from "../assets/player/player-idle.png";
import playerWalk from "../assets/player/player-walk.png";
import playerRun from "../assets/player/player-run.png";
import playerJumpUp from "../assets/player/player-jump-up.png";
import playerJumpDown from "../assets/player/player-jump-down.png";

export function preloadWorldAssets(scene) {
  scene.load.image("mountains", mountains);
  scene.load.image("farTrees", farTrees);
  scene.load.image("midTrees", midTrees);
  scene.load.image("frontTrees", frontTrees);
  scene.load.image("castle", castle);

  scene.load.image("ground", ground);

  scene.load.image("statue", statue);
  scene.load.image("bigRock", bigRock);
  scene.load.image("mediumRock", mediumRock);
  scene.load.image("bigBush", bigBush);
  scene.load.image("midBush", midBush);
  scene.load.image("smallBush", smallBush);
  scene.load.image("tree", tree);
  scene.load.image("brich", brich);

  scene.load.spritesheet("playerIdle", playerIdle, {
    frameWidth: 18,
    frameHeight: 45,
  });

  scene.load.spritesheet("playerWalk", playerWalk, {
    frameWidth: 19,
    frameHeight: 45,
  });

  scene.load.spritesheet("playerRun", playerRun, {
    frameWidth: 24,
    frameHeight: 45,
  });

  scene.load.spritesheet("playerJumpUp", playerJumpUp, {
    frameWidth: 21,
    frameHeight: 47,
  });

  scene.load.spritesheet("playerJumpDown", playerJumpDown, {
    frameWidth: 24,
    frameHeight: 49,
  });
}

export function createPlayerAnimations(scene) {
  if (!scene.anims.exists("idle")) {
    scene.anims.create({
      key: "idle",
      frames: scene.anims.generateFrameNumbers("playerIdle", {
        start: 0,
        end: 4,
      }),
      frameRate: 6,
      repeat: -1,
    });
  }

  if (!scene.anims.exists("walk")) {
    scene.anims.create({
      key: "walk",
      frames: scene.anims.generateFrameNumbers("playerWalk", {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  if (!scene.anims.exists("run")) {
    scene.anims.create({
      key: "run",
      frames: scene.anims.generateFrameNumbers("playerRun", {
        start: 0,
        end: 7,
      }),
      frameRate: 14,
      repeat: -1,
    });
  }

  if (!scene.anims.exists("jumpUp")) {
    scene.anims.create({
      key: "jumpUp",
      frames: scene.anims.generateFrameNumbers("playerJumpUp", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: 0,
    });
  }

  if (!scene.anims.exists("jumpDown")) {
    scene.anims.create({
      key: "jumpDown",
      frames: scene.anims.generateFrameNumbers("playerJumpDown", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: 0,
    });
  }
}
