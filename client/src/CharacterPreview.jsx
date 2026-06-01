import { useEffect, useRef } from "react";
import {
  MALE_SKIN_URLS, FEMALE_SKIN_URLS,
  MALE_HAIR_URLS, FEMALE_HAIR_URLS,
  MALE_TOP_URLS, MALE_BOT_URLS, MALE_BOOTS_URL, MALE_UNDER_URL,
  FEMALE_TOP_URLS, FEMALE_BOT_URL, FEMALE_BOOTS_URL, FEMALE_UNDER_URL,
  CHAR_FRAME_W, CHAR_FRAME_H,
  getWeaponUrl,
} from "./game/assets";
import "./CharacterPreview.css";

// Tight bounding box (pixel-scanned across all layers + all idle frames).
const CROP_X = 20;   // left edge within one 80px frame cell
const CROP_Y = 10;   // top edge
const CROP_W = 40;   // source width  (40 px in the sprite sheet)
const CROP_H = 54;   // source height (54 px)

const SCALE   = 7.5;
const DISP_W  = CROP_W * SCALE;   // 300 px canvas
const DISP_H  = CROP_H * SCALE;   // 405 px canvas

const IDLE_FRAMES = 5;   // frames 0-4 in row 0
const IDLE_FPS    = 6;

function loadImg(url) {
  return new Promise(resolve => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function CharacterPreview({ gender, skinIndex, hairIndex, outfitIndex, weaponTier, weaponType }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ imgs: [], frame: 0, timer: null, cancelled: false });

  function draw() {
    const canvas = canvasRef.current;
    const s = stateRef.current;
    if (!canvas || !s.imgs.length) return;

    const ctx = canvas.getContext("2d");
    // Nearest-neighbour — prevents blurry upscaling
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, DISP_W, DISP_H);

    const col  = s.frame;                          // 0-4 for idle
    const srcX = col * CHAR_FRAME_W + CROP_X;      // x in full 800×448 sheet

    for (const img of s.imgs) {
      if (img) ctx.drawImage(img, srcX, CROP_Y, CROP_W, CROP_H, 0, 0, DISP_W, DISP_H);
    }
  }

  useEffect(() => {
    const s = stateRef.current;
    s.cancelled = false;
    if (s.timer) { clearInterval(s.timer); s.timer = null; }

    const isMale  = gender !== "Female";
    const skinUrl  = (isMale ? MALE_SKIN_URLS  : FEMALE_SKIN_URLS)[skinIndex   - 1];
    const hairUrl  = (isMale ? MALE_HAIR_URLS  : FEMALE_HAIR_URLS)[hairIndex   - 1];
    const topUrl   = (isMale ? MALE_TOP_URLS   : FEMALE_TOP_URLS)[outfitIndex];
    const botUrl   = isMale  ? MALE_BOT_URLS[outfitIndex] : FEMALE_BOT_URL;
    const bootsUrl  = isMale  ? MALE_BOOTS_URL  : FEMALE_BOOTS_URL;
    const underUrl  = isMale  ? MALE_UNDER_URL  : FEMALE_UNDER_URL;
    const weaponUrl = getWeaponUrl(gender, weaponTier ?? 0, weaponType ?? 0);

    // Layer order (bottom → top): skin → underwear → boots → pants → shirt → hair → weapon
    const urls = [skinUrl, underUrl, bootsUrl, botUrl, topUrl, hairUrl, weaponUrl];

    Promise.all(urls.map(loadImg)).then(imgs => {
      if (s.cancelled) return;
      s.imgs  = imgs;
      s.frame = 0;
      draw();
      s.timer = setInterval(() => {
        if (s.cancelled) return;
        s.frame = (s.frame + 1) % IDLE_FRAMES;
        draw();
      }, Math.round(1000 / IDLE_FPS));
    });

    return () => {
      s.cancelled = true;
      if (s.timer) { clearInterval(s.timer); s.timer = null; }
    };
  }, [gender, skinIndex, hairIndex, outfitIndex, weaponTier, weaponType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className="char-preview-canvas"
      width={DISP_W}
      height={DISP_H}
    />
  );
}
