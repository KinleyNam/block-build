import playerIdle from "../assets/player/player-idle.png";
import playerWalk from "../assets/player/player-walk.png";
import playerRun from "../assets/player/player-run.png";
import playerJumpUp from "../assets/player/player-jump-up.png";
import playerJumpDown from "../assets/player/player-jump-down.png";
import grassyMountains from "../assets/CommercialDistrict/backgrounds/grassy_mountains.png";
import hill from "../assets/CommercialDistrict/backgrounds/hill.png";
import cloudsMid from "../assets/CommercialDistrict/backgrounds/clouds_mid.png";
import cloudsFront from "../assets/CommercialDistrict/backgrounds/clouds_front.png";
import ground from "../assets/platforms/ground.png";
import smallBush from "../assets/CommercialDistrict/props/small_bush.png";
import bigBush from "../assets/CommercialDistrict/props/big_bush.png";
import bushes from "../assets/CommercialDistrict/props/bushes.png";
import smallRocks from "../assets/CommercialDistrict/props/small_rocks.png";
import mediumRocks from "../assets/CommercialDistrict/props/medium_rocks.png";
import bigRock from "../assets/CommercialDistrict/props/big_rock.png";

import BlacksmithLvl3 from "../assets/CommercialDistrict/props/BlacksmithLvl3.png";
import CarpentryLvl2 from "../assets/CommercialDistrict/props/CarpentryLvl2.png";
import MagicResearchLvl1 from "../assets/CommercialDistrict/props/MagicResearchLvl1.png";
import Books from "../assets/MagicResearchAssets/props/Books.png";
import Chair from "../assets/MagicResearchAssets/props/Chair.png";
import Table from "../assets/MagicResearchAssets/props/Table.png";
import ChemistBottle from "../assets/MagicResearchAssets/props/ChemistBottle.png";
import Lamp from "../assets/MagicResearchAssets/props/Lamp.png";
import LyingBooks from "../assets/MagicResearchAssets/props/LyingBooks.png";
import MagicLogo from "../assets/MagicResearchAssets/props/MagicLogo.png";
import Sunlight from "../assets/MagicResearchAssets/props/Sunlight.png";
import SupportBeam from "../assets/MagicResearchAssets/props/SupportBeam.png";
import Interior from "../assets/MagicResearchAssets/backgrounds/Interior.png";







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



export function preloadMagicInteriorAssets(scene){

  scene.load.image("Interior", Interior);
    //Magic Research Props
  scene.load.image("Books", Books);
  scene.load.image("Chair", Chair); 
  scene.load.image("Table", Table);
  scene.load.image("ChemistBottle", ChemistBottle);
  scene.load.image("Lamp", Lamp);
  scene.load.image("LyingBooks", LyingBooks);
  scene.load.image("MagicLogo", MagicLogo);
  scene.load.image("Sunlight", Sunlight);
  scene.load.image("SupportBeam", SupportBeam);
}
export function preloadVillageAssets(scene) 
{  
  scene.load.image("magic_research_lvl1", MagicResearchLvl1);scene.load.image("carpentry_lvl2", CarpentryLvl2);
  scene.load.image("blacksmith_lvl3", BlacksmithLvl3);
  

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


