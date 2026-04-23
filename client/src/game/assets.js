import playerIdle from "../assets/player/player-idle.png";
import playerWalk from "../assets/player/player-walk.png";
import playerRun from "../assets/player/player-run.png";
import playerJumpUp from "../assets/player/player-jump-up.png";
import playerJumpDown from "../assets/player/player-jump-down.png";
import grassyMountains from "../assets/CommercialDistrict/backgrounds/grassy_mountains.png";
import hill from "../assets/backgrounds/hill.png";
import cloudsMid from "../assets/backgrounds/clouds_mid.png";
import cloudsFront from "../assets/backgrounds/clouds_front.png";
import ground from "../assets/platforms/ground.png";
import smallBush from "../assets/props/small_bush.png";
import bigBush from "../assets/props/big_bush.png";
import bushes from "../assets/props/bushes.png";
import smallRocks from "../assets/props/small_rocks.png";
import mediumRocks from "../assets/props/medium_rocks.png";
import bigRock from "../assets/props/big_rock.png";

function createIdleAnimation(scene, animationKey, textureKey, endFrame, frameRate = 6) {
  if(!scene.anims.exists(animationKey)){
        scene.anims.create({
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(textureKey, {
        start: 0,
        end: endFrame,
      }),
      frameRate,
      repeat: -1,
    });
  }
}

export function preloadWorldAssets(scene){
  // Load player spritesheets
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

  // Load background layers
  scene.load.image("grassy_mountains", grassyMountains);
  scene.load.image("hill", hill);
  scene.load.image("clouds_mid", cloudsMid);
  scene.load.image("clouds_front", cloudsFront);

  // Load ground and decorations
  scene.load.image("ground", ground);
  scene.load.image("small_bush", smallBush);
  scene.load.image("big_bush", bigBush);
  scene.load.image("bushes", bushes);
  scene.load.image("small_rocks", smallRocks);
  scene.load.image("medium_rocks", mediumRocks);
  scene.load.image("big_rock", bigRock);
}

export function preloadVillageAssets(scene) {
  // Village-specific assets loading will be added here
}


export function createPlayerAnimations(scene) {
  createIdleAnimation(scene, "idle", "playerIdle", 4, 6);
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


