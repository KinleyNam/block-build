// ── Character Asset Pack (800×448, 100×64 frames, 8 cols × 7 rows) ────────────
// All layers share the same frame layout so they stack pixel-perfectly.
// Row 0: Idle (frames 0-4)  Row 1: Walk (8-15)  Row 2: Run (16-23)
// Row 3: JumpUp (24-27)     Row 4: JumpDown (32-35)
export const CHAR_FRAME_W   = 80;  // confirmed via pixel analysis: 10 cols × 80px = 800
export const CHAR_FRAME_H   = 64;  // 7 rows × 64px = 448
export const CHAR_PACK_COLS = 10;

const _cpUrls = import.meta.glob(
  "../assets/Character Asset Pack/**/*.png",
  { eager: true, as: "url" },
);
function cpUrl(rel) {
  return _cpUrls[`../assets/Character Asset Pack/${rel}`];
}

const _range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => i + a);

// Ordered arrays — index 0-4 for skins, 0-N for hair, 0-4 for outfits
export const MALE_SKIN_URLS   = [1,2,3,4,5].map(i => cpUrl(`Character skin colors/Male Skin${i}.png`));
export const FEMALE_SKIN_URLS = [1,2,3,4,5].map(i => cpUrl(`Character skin colors/Female Skin${i}.png`));

// Hair styles from new "MaleHair/" / "FemaleHair/" folders only (6-30 / 6-35)
export const MALE_HAIR_URLS   = _range(6, 30).map(i => cpUrl(`MaleHair/Male Hair${i}.png`));   // 25 styles
export const FEMALE_HAIR_URLS = _range(6, 30).map(i => cpUrl(`FemaleHair/Female Hair${i}.png`)); // 25 styles

export const MALE_HAIR_COUNT   = 25;
export const FEMALE_HAIR_COUNT = 25;

// Male outfit tops (white/blue/green/orange/purple)
export const MALE_TOP_URLS = [
  cpUrl("Male Clothing/Shirt v2.png"),
  cpUrl("Male Clothing/Blue Shirt v2.png"),
  cpUrl("Male Clothing/Green Shirt v2.png"),
  cpUrl("Male Clothing/orange Shirt v2.png"),
  cpUrl("Male Clothing/Purple Shirt v2.png"),
];
// Male outfit bottoms (matching colours)
export const MALE_BOT_URLS = [
  cpUrl("Male Clothing/Pants.png"),
  cpUrl("Male Clothing/Blue Pants.png"),
  cpUrl("Male Clothing/Green Pants.png"),
  cpUrl("Male Clothing/Orange Pants.png"),
  cpUrl("Male Clothing/Purple Pants.png"),
];
export const MALE_BOOTS_URL  = cpUrl("Male Clothing/Boots.png");
export const MALE_UNDER_URL  = cpUrl("Male Clothing/Underwear.png");

// Female outfit tops (white/blue/green/orange/purple corsets)
export const FEMALE_TOP_URLS = [
  cpUrl("Female Clothing/Corset v2.png"),
  cpUrl("Female Clothing/Blue Corset v2.png"),
  cpUrl("Female Clothing/Green Corset v2.png"),
  cpUrl("Female Clothing/Orange Corset v2.png"),
  cpUrl("Female Clothing/Purple Corset v2.png"),
];
export const FEMALE_BOT_URL   = cpUrl("Female Clothing/Skirt.png");
export const FEMALE_BOOTS_URL = cpUrl("Female Clothing/Boots.png");
export const FEMALE_UNDER_URL = cpUrl("Female Clothing/Blue Panties and Bra.png");

// ── Weapon URLs (for in-game equip system) ───────────────────────────────────
const WEAPON_TIERS  = ["Wooden", "Bronze", "Iron", "Golden", "Diamond"];
const WEAPON_TYPES  = ["Sword", "Axe", "Pickaxe"];
export const MALE_WEAPON_URLS = Object.fromEntries(
  WEAPON_TIERS.flatMap(t => WEAPON_TYPES.map(w => [`${t} ${w}`, cpUrl(`MaleWeapon/${t} ${w}.png`)]))
);
export const FEMALE_WEAPON_URLS = Object.fromEntries(
  WEAPON_TIERS.flatMap(t => WEAPON_TYPES.map(w => [`${t} ${w}`, cpUrl(`FemaleWeapon/${t} ${w}.png`)]))
);
export const WEAPON_TIERS_LIST = WEAPON_TIERS;
export const WEAPON_TYPES_LIST = WEAPON_TYPES;

export function getWeaponUrl(gender, tierIndex, typeIndex) {
  const tier = WEAPON_TIERS[tierIndex] ?? WEAPON_TIERS[0];
  const type = WEAPON_TYPES[typeIndex] ?? WEAPON_TYPES[0];
  const urls = gender === "Female" ? FEMALE_WEAPON_URLS : MALE_WEAPON_URLS;
  return urls[`${tier} ${type}`];
}

// Phaser texture key for a weapon (used in-game as a spritesheet layer)
export function getWeaponTextureKey(gender, tierIndex, typeIndex) {
  const g = gender === "Female" ? "f" : "m";
  return `cWpn_${g}_${tierIndex ?? 0}_${typeIndex ?? 0}`;
}

// ── Derive texture keys from customization ────────────────────────────────────
export function getCharacterKeys(gender, { skinIndex = 1, hairIndex = 1, outfitIndex = 0 } = {}) {
  const g   = gender === "Female" ? "f" : "m";
  const bot = g === "f" ? "cBot_f" : `cBot_m_${outfitIndex}`; // female has 1 skirt
  return {
    skin:  `cSkin_${g}_${skinIndex}`,
    hair:  `cHair_${g}_${hairIndex}`,
    top:   `cTop_${g}_${outfitIndex}`,
    bot,
    boots: `cBoots_${g}`,
    under: `cUnder_${g}`,
  };
}

import ciaccona        from "../assets/music/ciaccona.mp3";
import starterSong     from "../assets/music/Tutorial-starter-area-song.mp3";
import commercialSong  from "../assets/music/Commercial-song.mp3";
import marketplaceSong from "../assets/music/Marketplace-song.mp3";
import fightSound      from "../assets/music/FIGHT!-sound.MP3";
import pvpSong         from "../assets/music/PvP-Song.mp3";
import koSound         from "../assets/music/KO!-sound.MP3";
import buttonGImg   from "../assets/intereaction/ButtonG.png";
import pvpAttackImg   from "../assets/player/PvP/male-attack.png";
import pvpDeathImg    from "../assets/player/PvP/male-death.png";
import pvpSlideImg    from "../assets/player/PvP/male-slide.png";
import pvpHeartImg    from "../assets/player/PvP/HeartSpriteSheet.png";
import pvpHpEmptyImg  from "../assets/player/PvP/Health-Bar-Empty.png";
import pvpHpFullImg   from "../assets/player/PvP/Health-Bar-Full.png";
import pvpStEmptyImg  from "../assets/player/PvP/Stamina-Bar-Empty.png";
import pvpStFullImg   from "../assets/player/PvP/Stamina-Bar-Full.png";

import emojiAngry          from "../assets/emoji/AngryEmoji.png";
import emojiCrying         from "../assets/emoji/CryingEmoji.png";
import emojiDisappointed   from "../assets/emoji/DisappointedEmoji.png";
import emojiLoveeyes       from "../assets/emoji/LoveEyesEmoji.png";
import emojiQuestion       from "../assets/emoji/QuestionEmoji.png";
import emojiRaisedeyebrow  from "../assets/emoji/RaisedEyebrow.png";
import emojiSkull          from "../assets/emoji/SkullEmoji.png";
import emojiSmiling        from "../assets/emoji/SmilingEmoji.png";
import emojiYawning        from "../assets/emoji/YawningEmoji.png";

const EMOJI_ASSETS = [
  ["emoji_angry",         emojiAngry],
  ["emoji_crying",        emojiCrying],
  ["emoji_disappointed",  emojiDisappointed],
  ["emoji_loveeyes",      emojiLoveeyes],
  ["emoji_question",      emojiQuestion],
  ["emoji_raisedeyebrow", emojiRaisedeyebrow],
  ["emoji_skull",         emojiSkull],
  ["emoji_smiling",       emojiSmiling],
  ["emoji_yawning",       emojiYawning],
];
import goddessWalkImg from "../assets/tutorial/godess-walk.png";
import eKeyPrompt from "../assets/intereaction/ButtonE.png";
import escapeKeyImg from "../assets/UIElement/Escape-key.png";
import goldHolderImg from "../assets/UIElement/Gold-holder.png";
import leaderBoardImg from "../assets/UIElement/leaderBoard.png";
import titleBgImg from "../assets/UIElement/title-background.png";
import buttonBgImg from "../assets/UIElement/Button-Background.png";
import mountains from "../assets/backgrounds/mountains.png";
import farTrees from "../assets/backgrounds/far-trees.png";
import midTrees from "../assets/backgrounds/mid-trees.png";
import frontTrees from "../assets/backgrounds/Front-trees.png";
import castle from "../assets/backgrounds/Castle.png";

import ground from "../assets/platforms/ground.png";

import statue from "../assets/props/statue.png";
import ownerSignboard from "../assets/props/OwnerSignboard.png";
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
import cookingPotAnim from "../assets/VillageOutskirtsAssets/props/Cooking-pot.png";
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
import redArcherIdle from "../assets/VillageOutskirtsAssets/npc/Archer-idle.png";
import sittingKnightIdle from "../assets/VillageOutskirtsAssets/npc/Sitting-Knight-idle.png";
import dancingCouple from "../assets/VillageOutskirtsAssets/npc/Dancing-couple-idle.png";
import femaleSittingCross from "../assets/VillageOutskirtsAssets/npc/Female-sitting-cross-legged-idle.png";
import guitaristKnight from "../assets/VillageOutskirtsAssets/npc/Guitarist-Kinght-idle.png";
import fluteGuy from "../assets/VillageOutskirtsAssets/npc/Tavern-flutist-idle.png";
import gutaristGuy from "../assets/VillageOutskirtsAssets/npc/Tavern-Bard-idle.png";
import lyingFemale from "../assets/VillageOutskirtsAssets/npc/Lying-lady.png";
import fatKnightBeer from "../assets/VillageOutskirtsAssets/npc/Fat-knight-beer-idle.png";
import romanYellowGirl from "../assets/VillageOutskirtsAssets/npc/yellow-Roman-female-idle.png";
import romanBlueGirl from "../assets/VillageOutskirtsAssets/npc/Blue-Roman-female-idle.png";
import spanishInquisition from "../assets/VillageOutskirtsAssets/npc/Spanishinquisition-idle.png";
import baldKnight from "../assets/VillageOutskirtsAssets/npc/Bald-Knight-idle.png";
import shieldKnight from "../assets/VillageOutskirtsAssets/npc/Shielded-Knight-idle.png";
import helmetDog from "../assets/VillageOutskirtsAssets/Animals/Helmet-doggy-idle.png";

import pussInBoots from "../assets/VillageOutskirtsAssets/Animals/Puss-in-Boots-idle.png";

// ── Building sprites (placed on land in CommercialDistrict) ──────────────────
import bldgBlacksmith1 from "../assets/work Buildings/Buildings/BlacksmithLvl1.png";
import bldgBlacksmith2 from "../assets/work Buildings/Buildings/BlacksmithLvl2.png";
import bldgBlacksmith3 from "../assets/work Buildings/Buildings/BlacksmithLvl3.png";
import bldgCarpentry1  from "../assets/work Buildings/Buildings/Carpentrylvl1.png";
import bldgCarpentry2  from "../assets/work Buildings/Buildings/CarpentryLvl2.png";
import bldgCarpentry3  from "../assets/work Buildings/Buildings/Carpentrylvl3.png";
import bldgMagic1      from "../assets/work Buildings/Buildings/MagicResearchLvl1.png";
import bldgMagic2      from "../assets/work Buildings/Buildings/MagicResearchLvl2.png";
import bldgMagic3      from "../assets/work Buildings/Buildings/MagicResearchlvl3.png";

export const BUILDING_SPRITE_ASSETS = [
  ["bldg_blacksmith_1", bldgBlacksmith1],
  ["bldg_blacksmith_2", bldgBlacksmith2],
  ["bldg_blacksmith_3", bldgBlacksmith3],
  ["bldg_carpentry_1",  bldgCarpentry1],
  ["bldg_carpentry_2",  bldgCarpentry2],
  ["bldg_carpentry_3",  bldgCarpentry3],
  ["bldg_magicresearch_1", bldgMagic1],
  ["bldg_magicresearch_2", bldgMagic2],
  ["bldg_magicresearch_3", bldgMagic3],
];

import grassyMountains from "../assets/CommercialDistrict/backgrounds/grassy_mountains.png";
import cdHill from "../assets/CommercialDistrict/backgrounds/hill.png";
import cloudsMid from "../assets/CommercialDistrict/backgrounds/clouds_mid.png";
import cloudsFront from "../assets/CommercialDistrict/backgrounds/clouds_front.png";
import cdSmallBush from "../assets/CommercialDistrict/props/small_bush.png";
import cdBigBush from "../assets/CommercialDistrict/props/big_bush.png";
import cdBushes from "../assets/CommercialDistrict/props/bushes.png";
import cdSmallRocks from "../assets/CommercialDistrict/props/small_rocks.png";
import cdMediumRocks from "../assets/CommercialDistrict/props/medium_rocks.png";
import cdBigRock from "../assets/CommercialDistrict/props/big_rock.png";

import blueStall from "../assets/Marketplace/Buildings/Blue-stall.png";
import gate from "../assets/Marketplace/Buildings/Gate.png";
import longStoneHouse from "../assets/Marketplace/Buildings/Long-Stone-house.png";
import redStall from "../assets/Marketplace/Buildings/Red-stall.png";
import stoneHouse from "../assets/Marketplace/Buildings/Stone-house.png";
import villageTownhall from "../assets/Marketplace/Buildings/Village-townhall.png";
import woodHouse from "../assets/Marketplace/Buildings/Wood-house.png";

import appleGirl from "../assets/Marketplace/npc/apple-girl-idle.png";
import blackMarketDealer from "../assets/Marketplace/npc/Black-Market-Dealer-idle.png";
import darkRobedNun from "../assets/Marketplace/npc/Dark-Robed-Nun-idle.png";
import farmer from "../assets/Marketplace/npc/Farmer-idle.png";
import femaleKnight from "../assets/Marketplace/npc/Female-Knight-idle.png";
import femaleWizard from "../assets/Marketplace/npc/Female-Wizard-idle.png";
import ladySittingDown from "../assets/Marketplace/npc/Lady-sitting-down-idle.png";
import miner from "../assets/Marketplace/npc/Miner-idle.png";
import plagueDoctor from "../assets/Marketplace/npc/Plague Doctor idle.png";
import readingGirl from "../assets/Marketplace/npc/Reading-Girl-idle.png";
import shopkeeper from "../assets/Marketplace/npc/Shopkeeper-idle.png";
import baroness from "../assets/VillageOutskirtsAssets/npc/Baroness-Idle.png";
import goddess from "../assets/Marketplace/npc/Goddes.png";

import clothHang from "../assets/Marketplace/props/Cloth-hang.png";
import doorSign from "../assets/Marketplace/props/Door-sign.png";
import vasePurple from "../assets/Marketplace/props/Vase-purple.png";
import Apple from "../assets/Marketplace/props/Apple.png";
import stallInv from "../assets/Marketplace/props/stallInventory.png";
import bunchOfApples from "../assets/Marketplace/props/Bunch-of-apples.png";

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

function preloadEmojiAssets(scene) {
  EMOJI_ASSETS.forEach(([key, path]) => {
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, path, { frameWidth: 16, frameHeight: 17 });
    }
  });
}

function createEmojiAnimations(scene) {
  EMOJI_ASSETS.forEach(([key]) => {
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 18 }),
        frameRate: 12,
        repeat: -1,
      });
    }
  });
}

export function preloadWorldAssets(scene) {
  scene.load.audio("ciaccona",     ciaccona);
  scene.load.audio("starter_song", starterSong);
  scene.load.image("eKeyPrompt", eKeyPrompt);
  scene.load.image("buttonG", buttonGImg);
  scene.load.image("uiEscapeKey", escapeKeyImg);
  scene.load.image("uiGoldHolder", goldHolderImg);
  scene.load.image("uiLeaderBoard", leaderBoardImg);
  scene.load.image("titleBg", titleBgImg);
  scene.load.image("buttonBg", buttonBgImg);
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

  scene.load.spritesheet("goddessWalk", goddessWalkImg, {
    frameWidth: 29,
    frameHeight: 47,
  });

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

  scene.load.spritesheet("pvpAttack", pvpAttackImg, { frameWidth: 74, frameHeight: 63 });
  scene.load.spritesheet("pvpDeath",  pvpDeathImg,  { frameWidth: 46, frameHeight: 44 });

  preloadEmojiAssets(scene);
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
  scene.load.spritesheet("cookingPot", cookingPotAnim, {
    frameWidth: 32,
    frameHeight: 32,
  });
  scene.load.spritesheet("archerIdle", redArcherIdle, {
    frameWidth: 32,
    frameHeight: 43,
  });
  scene.load.spritesheet("sittingKnight", sittingKnightIdle, {
    frameWidth: 31,
    frameHeight: 34,
  });
  scene.load.spritesheet("dancingCouple", dancingCouple, {
    frameWidth: 36,
    frameHeight: 43,
  });
  scene.load.spritesheet("femaleSittingCross", femaleSittingCross, {
    frameWidth: 24,
    frameHeight: 29,
  });
  scene.load.spritesheet("guitaristKnight", guitaristKnight, {
    frameWidth: 30,
    frameHeight: 29,
  });
  scene.load.spritesheet("fluteGuy", fluteGuy, {
    frameWidth: 25,
    frameHeight: 45,
  });
  scene.load.spritesheet("gutaristGuy", gutaristGuy, {
    frameWidth: 28,
    frameHeight: 43,
  });
  scene.load.spritesheet("lyingFemale", lyingFemale, {
    frameWidth: 38,
    frameHeight: 19,
  });
  scene.load.spritesheet("fatKnightBeer", fatKnightBeer, {
    frameWidth: 29,
    frameHeight: 42,
  });
  scene.load.spritesheet("romanYellowGirl", romanYellowGirl, {
    frameWidth: 18,
    frameHeight: 43,
  });
  scene.load.spritesheet("romanBlueGirl", romanBlueGirl, {
    frameWidth: 23,
    frameHeight: 46,
  });
  scene.load.spritesheet("spanishInquisition", spanishInquisition, {
    frameWidth: 22,
    frameHeight: 45,
  });
  scene.load.spritesheet("baldKnight", baldKnight, {
    frameWidth: 28,
    frameHeight: 42,
  });
  scene.load.spritesheet("shieldKnight", shieldKnight, {
    frameWidth: 34,
    frameHeight: 46,
  });
  scene.load.spritesheet("helmetDog", helmetDog, {
    frameWidth: 21,
    frameHeight: 33,
  });
  scene.load.spritesheet("pussInBoots", pussInBoots, {
    frameWidth: 25,
    frameHeight: 23,
  });
}

export function createPlayerAnimations(scene) {
  createEmojiAnimations(scene);
  createAllCharacterAnimations(scene);
  createIdleAnimation(scene, "idle", "playerIdle", 4, 6); // kept for any legacy refs

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

  if (!scene.anims.exists("pvpAttack")) {
    scene.anims.create({
      key: "pvpAttack",
      frames: scene.anims.generateFrameNumbers("pvpAttack", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0,
    });
  }

  if (!scene.anims.exists("pvpDeath")) {
    scene.anims.create({
      key: "pvpDeath",
      frames: scene.anims.generateFrameNumbers("pvpDeath", { start: 0, end: 7 }),
      frameRate: 8,
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
  createIdleAnimation(scene, "cookingPot", "cookingPot", 4, 6);
  createIdleAnimation(scene, "archerIdle", "archerIdle", 4, 6);
  createIdleAnimation(scene, "sittingKnight", "sittingKnight", 4, 6);
  createIdleAnimation(scene, "dancingCouple", "dancingCouple", 4, 6);
  createIdleAnimation(scene, "femaleSittingCross", "femaleSittingCross", 4, 6);
  createIdleAnimation(scene, "guitaristKnight", "guitaristKnight", 4, 6);
  createIdleAnimation(scene, "fluteGuy", "fluteGuy", 4, 6);
  createIdleAnimation(scene, "gutaristGuy", "gutaristGuy", 4, 6);
  createIdleAnimation(scene, "lyingFemale", "lyingFemale", 4, 6);
  createIdleAnimation(scene, "fatKnightBeer", "fatKnightBeer", 4, 6);
  createIdleAnimation(scene, "romanYellowGirl", "romanYellowGirl", 4, 6);
  createIdleAnimation(scene, "romanBlueGirl", "romanBlueGirl", 4, 6);
  createIdleAnimation(scene, "spanishInquisition", "spanishInquisition", 4, 6);
  createIdleAnimation(scene, "baldKnight", "baldKnight", 4, 6);
  createIdleAnimation(scene, "shieldKnight", "shieldKnight", 4, 6);
}



export function preloadMarketplaceAssets(scene) {
  preloadWorldAssets(scene);
  scene.load.audio("marketplace_song", marketplaceSong);

  scene.load.image("wall", wallImg);

  scene.load.image("blueStall", blueStall);
  scene.load.image("gate", gate);
  scene.load.image("longStoneHouse", longStoneHouse);
  scene.load.image("redStall", redStall);
  scene.load.image("stoneHouse", stoneHouse);
  scene.load.image("villageTownhall", villageTownhall);
  scene.load.image("woodHouse", woodHouse);
  scene.load.image("stable", stableImg);
  scene.load.image("apple", Apple);

  scene.load.image("clothHang", clothHang);
  scene.load.image("doorSign", doorSign);
  scene.load.image("vasePurple", vasePurple);
  scene.load.image("woodBox", woodBoxImg);
  scene.load.image("barrel", barrelImg);
  scene.load.image("stallInv", stallInv);
  scene.load.image("bunchOfApples", bunchOfApples);

  scene.load.spritesheet("appleGirl", appleGirl, { 
    frameWidth: 21, 
    frameHeight: 42 
  });
  scene.load.spritesheet("romanYellowGirl", romanYellowGirl, {
    frameWidth: 18,
    frameHeight: 43,
  });
  scene.load.spritesheet("blackMarketDealer", blackMarketDealer, { 
    frameWidth: 33, 
    frameHeight: 44 
  });
  scene.load.spritesheet("darkRobedNun", darkRobedNun, { 
    frameWidth: 19, 
    frameHeight: 42 
  });
  scene.load.spritesheet("farmer", farmer, { 
    frameWidth: 28, 
    frameHeight: 48 
  });
  scene.load.spritesheet("femaleKnight", femaleKnight, { 
    frameWidth: 39, 
    frameHeight: 49 
  });
  scene.load.spritesheet("femaleWizard", femaleWizard, { 
    frameWidth: 34, 
    frameHeight: 55 
  });
  scene.load.spritesheet("ladySittingDown", ladySittingDown, { 
    frameWidth: 21, 
    frameHeight: 36 
  });
  scene.load.spritesheet("miner", miner, { 
    frameWidth: 29, 
    frameHeight: 45 
  });
  scene.load.spritesheet("plagueDoctor", plagueDoctor, { 
    frameWidth: 32, 
    frameHeight: 44 
  });
  scene.load.spritesheet("readingGirl", readingGirl, { 
    frameWidth: 24, 
    frameHeight: 44 
  });
  scene.load.spritesheet("shopkeeper", shopkeeper, { 
    frameWidth: 22, 
    frameHeight: 44 
  });
  scene.load.spritesheet("archerIdle", redArcherIdle, { 
    frameWidth: 32, 
    frameHeight: 43 
  });
  scene.load.spritesheet("blueLady", blueLadyImg, {
    frameWidth: 24,
    frameHeight: 43,
  });
  scene.load.spritesheet("baroness", baroness, {
    frameWidth: 17,
    frameHeight: 45,
  });
  scene.load.spritesheet("blueLady", blueLadyImg, {
    frameWidth: 24,
    frameHeight: 43,
  });
  scene.load.spritesheet("romanBlueGirl", romanBlueGirl, {
    frameWidth: 23,
    frameHeight: 46,
  });
  scene.load.spritesheet("goddess", goddess, {
    frameWidth: 30,
    frameHeight: 47,
  });
  scene.load.spritesheet("helmetDog", helmetDog, {
    frameWidth: 21,
    frameHeight: 33,
  });
  scene.load.spritesheet("shieldKnight", shieldKnight, {
    frameWidth: 34,
    frameHeight: 46,
  });
}

export function preloadCommercialAssets(scene) {
  preloadWorldAssets(scene);
  scene.load.audio("commercial_song", commercialSong);

  scene.load.image("ownerSignboard", ownerSignboard);
  scene.load.image("grassy_mountains", grassyMountains);

  // Building sprites for placing on land parcels
  BUILDING_SPRITE_ASSETS.forEach(([key, path]) => {
    if (!scene.textures.exists(key)) scene.load.image(key, path);
  });
  scene.load.image("hill", cdHill);
  scene.load.image("clouds_mid", cloudsMid);
  scene.load.image("clouds_front", cloudsFront);

  scene.load.image("small_bush", cdSmallBush);
  scene.load.image("big_bush", cdBigBush);
  scene.load.image("bushes", cdBushes);
  scene.load.image("small_rocks", cdSmallRocks);
  scene.load.image("medium_rocks", cdMediumRocks);
  scene.load.image("big_rock", cdBigRock);
}

export function preloadPvPAssets(scene) {
  preloadCommercialAssets(scene);
  scene.load.audio("fight_sound", fightSound);
  scene.load.audio("pvp_song",    pvpSong);
  scene.load.audio("ko_sound",    koSound);
  scene.load.spritesheet("pvpSlide",   pvpSlideImg,   { frameWidth: 50,  frameHeight: 25 });
  scene.load.spritesheet("pvpHeart",   pvpHeartImg,   { frameWidth: 90,  frameHeight: 28 });
  scene.load.image("pvpHpEmpty",  pvpHpEmptyImg);
  scene.load.image("pvpHpFull",   pvpHpFullImg);
  scene.load.image("pvpStEmpty",  pvpStEmptyImg);
  scene.load.image("pvpStFull",   pvpStFullImg);
}

export function createPvPAnimations(scene) {
  createPlayerAnimations(scene);
  if (!scene.anims.exists("pvpSlide")) {
    scene.anims.create({
      key: "pvpSlide",
      frames: scene.anims.generateFrameNumbers("pvpSlide", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!scene.anims.exists("pvpHeart")) {
    scene.anims.create({
      key: "pvpHeart",
      frames: scene.anims.generateFrameNumbers("pvpHeart", { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1,
    });
  }
}

export function createMarketAnimations(scene) {
  createIdleAnimation(scene, "archerIdle", "archerIdle", 4, 6);
  createIdleAnimation(scene, "romanYellowGirl", "romanYellowGirl", 4, 6);
  createIdleAnimation(scene, "appleGirl", "appleGirl", 4, 6);
  createIdleAnimation(scene, "baroness", "baroness", 4, 6);
  createIdleAnimation(scene, "blueLady", "blueLady", 4, 6);
  createIdleAnimation(scene, "blackMarketDealer", "blackMarketDealer", 4, 6);
  createIdleAnimation(scene, "darkRobedNun", "darkRobedNun", 4, 6);
  createIdleAnimation(scene, "farmer", "farmer", 4, 6);
  createIdleAnimation(scene, "femaleKnight", "femaleKnight", 4, 6);
  createIdleAnimation(scene, "femaleWizard", "femaleWizard", 4, 6);
  createIdleAnimation(scene, "ladySittingDown", "ladySittingDown", 4, 6);
  createIdleAnimation(scene, "miner", "miner", 4, 6);
  createIdleAnimation(scene, "plagueDoctor", "plagueDoctor", 4, 6);
  createIdleAnimation(scene, "readingGirl", "readingGirl", 4, 6);
  createIdleAnimation(scene, "shopkeeper", "shopkeeper", 4, 6);
  createIdleAnimation(scene, "romanBlueGirl", "romanBlueGirl", 4, 6);
  createIdleAnimation(scene, "goddess", "goddess", 4, 6);
  createIdleAnimation(scene, "helmetDog", "helmetDog", 4, 6);
  createIdleAnimation(scene, "shieldKnight", "shieldKnight", 4, 6);
}

// ── Character Pack loading ─────────────────────────────────────────────────────

function cpSpritesheet(scene, key, url) {
  if (!scene.textures.exists(key)) {
    scene.load.spritesheet(key, url, { frameWidth: CHAR_FRAME_W, frameHeight: CHAR_FRAME_H });
  }
}

export function preloadCharacterPackAssets(scene) {
  if (scene.textures.exists("cSkin_m_1")) return; // already loaded

  // Skins
  for (let i = 0; i < 5; i++) {
    cpSpritesheet(scene, `cSkin_m_${i + 1}`, MALE_SKIN_URLS[i]);
    cpSpritesheet(scene, `cSkin_f_${i + 1}`, FEMALE_SKIN_URLS[i]);
  }
  // Hair — all 30 male styles and 35 female styles
  MALE_HAIR_URLS.forEach((url, i)   => cpSpritesheet(scene, `cHair_m_${i + 1}`, url));
  FEMALE_HAIR_URLS.forEach((url, i) => cpSpritesheet(scene, `cHair_f_${i + 1}`, url));
  // Male tops, bottoms, boots, underwear
  for (let i = 0; i < 5; i++) {
    cpSpritesheet(scene, `cTop_m_${i}`,  MALE_TOP_URLS[i]);
    cpSpritesheet(scene, `cBot_m_${i}`,  MALE_BOT_URLS[i]);
  }
  cpSpritesheet(scene, "cBoots_m", MALE_BOOTS_URL);
  cpSpritesheet(scene, "cUnder_m", MALE_UNDER_URL);
  // Female tops, bottom, boots, underwear
  for (let i = 0; i < 5; i++) {
    cpSpritesheet(scene, `cTop_f_${i}`, FEMALE_TOP_URLS[i]);
  }
  cpSpritesheet(scene, "cBot_f",    FEMALE_BOT_URL);
  cpSpritesheet(scene, "cBoots_f",  FEMALE_BOOTS_URL);
  cpSpritesheet(scene, "cUnder_f",  FEMALE_UNDER_URL);

  // Weapons — 5 tiers × 3 types × 2 genders = 30 textures
  [["m", MALE_WEAPON_URLS], ["f", FEMALE_WEAPON_URLS]].forEach(([g, urls]) => {
    WEAPON_TIERS.forEach((tier, ti) => {
      WEAPON_TYPES.forEach((type, wi) => {
        cpSpritesheet(scene, `cWpn_${g}_${ti}_${wi}`, urls[`${tier} ${type}`]);
      });
    });
  });
}

// Create animation keys for a specific skin texture (e.g. "cSkin_m_1").
// Keys follow the pattern: "<skinKey>_idle", "_walk", "_run", "_jumpUp", "_jumpDown".
export function createCharacterSkinAnimations(scene, skinKey) {
  // Frame indices confirmed via pixel analysis (10 cols × 7 rows, frame width 80px):
  //  Row 0 → col 0..9 = frames  0.. 9  | Row 1 → 10..19 | Row 2 → 20..29
  //  Row 3 → 30..39 | Row 4 → 40..49  | Row 5 → 50..59 | Row 6 → 60..69
  const ANIMS = [
    { suffix: "_idle",     start:  0, end:  4, fps:  6, repeat: -1 },
    { suffix: "_walk",     start: 10, end: 17, fps: 10, repeat: -1 },
    { suffix: "_run",      start: 20, end: 27, fps: 14, repeat: -1 },
    { suffix: "_jumpUp",   start: 30, end: 33, fps: 10, repeat:  0 },
    { suffix: "_jumpDown", start: 40, end: 43, fps: 10, repeat:  0 },
    { suffix: "_attack",   start: 50, end: 55, fps: 10, repeat:  0 },
    { suffix: "_death",    start: 60, end: 69, fps:  8, repeat:  0 },
  ];
  ANIMS.forEach(({ suffix, start, end, fps, repeat }) => {
    const key = skinKey + suffix;
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(skinKey, { start, end }),
        frameRate: fps,
        repeat,
      });
    }
  });
}

// Create animations for ALL 10 skins so remote players with any skin work.
export function createAllCharacterAnimations(scene) {
  for (const g of ["m", "f"]) {
    for (let i = 1; i <= 5; i++) {
      createCharacterSkinAnimations(scene, `cSkin_${g}_${i}`);
    }
  }
}
