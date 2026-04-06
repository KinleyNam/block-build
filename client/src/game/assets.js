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

import tavernImg from "../assets/VillageOutskirtsAssets/Building/Tavern green roof.png";
import stableImg from "../assets/VillageOutskirtsAssets/Building/Stable.png";
import tentImg from "../assets/VillageOutskirtsAssets/Building/Tent.png";
import wallImg from "../assets/VillageOutskirtsAssets/Building/Wall.png";
import twoWallsImg from "../assets/VillageOutskirtsAssets/Building/Back-walls.png";

import appleTreeImg from "../assets/VillageOutskirtsAssets/props/Apple-tree.png";
import tallTreeImg from "../assets/VillageOutskirtsAssets/props/Tall-tree.png";
import barrelImg from "../assets/VillageOutskirtsAssets/props/Barrel.png";
import chairImg from "../assets/VillageOutskirtsAssets/props/Chair.png";
import tableImg from "../assets/VillageOutskirtsAssets/props/Table.png";
import stoolImg from "../assets/VillageOutskirtsAssets/props/Stool.png";
import cookingPotImg from "../assets/VillageOutskirtsAssets/props/Cooking-pot.png";
import signPostImg from "../assets/VillageOutskirtsAssets/props/Sign-post.png";
import applesImg from "../assets/VillageOutskirtsAssets/props/Apples.png";
import basketAppleImg from "../assets/VillageOutskirtsAssets/props/Basket-apple.png";
import basketBreadImg from "../assets/VillageOutskirtsAssets/props/Basket-bread.png";
import bunchBottlesImg from "../assets/VillageOutskirtsAssets/props/Bunch-of-bottles.png";
import oneBottleImg from "../assets/VillageOutskirtsAssets/props/One-bottle.png";
import threeBottlesImg from "../assets/VillageOutskirtsAssets/props/Three-bottels.png";
import woodBoxImg from "../assets/VillageOutskirtsAssets/props/Wood-box.png";
import grassImg from "../assets/VillageOutskirtsAssets/props/Grass.png";
import potImg from "../assets/VillageOutskirtsAssets/props/Pot.png";
import cloud1Img from "../assets/VillageOutskirtsAssets/props/Cloud-1.png";
import cloud2Img from "../assets/VillageOutskirtsAssets/props/Cloud-2.png";

import horseImg from "../assets/VillageOutskirtsAssets/Animals/horse.png";
import blackHorseImg from "../assets/VillageOutskirtsAssets/Animals/black horse.png";

import pubWaitressImg from "../assets/VillageOutskirtsAssets/npc/Pub-waitress-idle.png";
import pubWaiterImg from "../assets/VillageOutskirtsAssets/npc/Pub-waiter-idle.png";
import beerManImg from "../assets/VillageOutskirtsAssets/npc/Man-holding-beer-cup-idle.png";
import blueLadyImg from "../assets/VillageOutskirtsAssets/npc/Blue-grape-lady-idle.png";
import ladyChefImg from "../assets/VillageOutskirtsAssets/npc/Ladychef-idle.png";

function createIdleAnimation(scene, animationKey, textureKey, endFrame, frameRate = 6) {
  if (!scene.anims.exists(animationKey)) {
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

export function preloadVillageAssets(scene) {
  preloadWorldAssets(scene);

  scene.load.image("tavern", tavernImg);
  scene.load.image("stable", stableImg);
  scene.load.image("tent", tentImg);
  scene.load.image("wall", wallImg);
  scene.load.image("twoWalls", twoWallsImg);

  scene.load.image("appleTree", appleTreeImg);
  scene.load.image("tallTree", tallTreeImg);
  scene.load.image("barrel", barrelImg);
  scene.load.image("chair", chairImg);
  scene.load.image("table", tableImg);
  scene.load.image("stool", stoolImg);
  scene.load.image("cookingPot", cookingPotImg);
  scene.load.image("signPost", signPostImg);
  scene.load.image("apples", applesImg);
  scene.load.image("basketApple", basketAppleImg);
  scene.load.image("basketBread", basketBreadImg);
  scene.load.image("bunchBottles", bunchBottlesImg);
  scene.load.image("oneBottle", oneBottleImg);
  scene.load.image("threeBottles", threeBottlesImg);
  scene.load.image("woodBox", woodBoxImg);
  scene.load.image("grass", grassImg);
  scene.load.image("pot", potImg);
  scene.load.image("cloud1", cloud1Img);
  scene.load.image("cloud2", cloud2Img);
  scene.load.image("horse", horseImg);
  scene.load.image("blackHorse", blackHorseImg);

  scene.load.spritesheet("pubWaitress", pubWaitressImg, {
    frameWidth: 33,
    frameHeight: 43,
  });
  scene.load.spritesheet("pubWaiter", pubWaiterImg, {
    frameWidth: 44,
    frameHeight: 44,
  });
  scene.load.spritesheet("beerMan", beerManImg, {
    frameWidth: 27,
    frameHeight: 44,
  });
  scene.load.spritesheet("blueLady", blueLadyImg, {
    frameWidth: 24,
    frameHeight: 43,
  });
  scene.load.spritesheet("ladyChef", ladyChefImg, {
    frameWidth: 24,
    frameHeight: 48,
  });
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

export function createVillageAnimations(scene) {
  createIdleAnimation(scene, "pubWaitress", "pubWaitress", 4, 7);
  createIdleAnimation(scene, "pubWaiter", "pubWaiter", 4, 7);
  createIdleAnimation(scene, "beerMan", "beerMan", 4, 6);
  createIdleAnimation(scene, "blueLady", "blueLady", 4, 6);
  createIdleAnimation(scene, "ladyChef", "ladyChef", 4, 6);
}
