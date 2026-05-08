import Phaser from "phaser";
import type { TileType } from "@starfall/shared";
export { avatarOptions } from "./avatar-options";

const TILE_COLORS: Record<TileType, { base: number; shade: number; highlight: number }> = {
  air: { base: 0x000000, shade: 0x000000, highlight: 0x000000 },
  meadow_grass: { base: 0x4d8f5c, shade: 0x244736, highlight: 0xb3f07f },
  loam: { base: 0x76513d, shade: 0x3f2e2b, highlight: 0xc28a5a },
  starstone: { base: 0x38425f, shade: 0x1b2036, highlight: 0x7188c2 },
  moon_crystal: { base: 0x80dfff, shade: 0x2b5faf, highlight: 0xf2fdff },
  meteor_brick: { base: 0xa8583f, shade: 0x512b35, highlight: 0xffb35f },
  plaza_lamp: { base: 0xffcf61, shade: 0x6b3b37, highlight: 0xfff3a6 }
};

const AVATAR_COLORS: Record<string, { body: number; trim: number; glow: number }> = {
  nova: { body: 0x3fb9e8, trim: 0xf4d35e, glow: 0xe9fffb },
  ember: { body: 0xd96b4e, trim: 0x98dce8, glow: 0xfff0cf },
  moss: { body: 0x72b867, trim: 0xf0ba59, glow: 0xedffd4 },
  violet: { body: 0x8f78f3, trim: 0xf4a2c8, glow: 0xf6e8ff }
};

const OUTLINE = 0x10172d;

export function ensureGameTextures(scene: Phaser.Scene): void {
  for (const tile of Object.keys(TILE_COLORS) as TileType[]) {
    if (tile !== "air") {
      ensureTileTexture(scene, tile);
    }
  }
  for (const avatarId of Object.keys(AVATAR_COLORS)) {
    ensureAvatarTexture(scene, avatarId);
  }
}

export function ensureTileTexture(scene: Phaser.Scene, tile: TileType): string {
  const key = `tile-${tile}`;
  if (scene.textures.exists(key)) {
    return key;
  }

  const colors = TILE_COLORS[tile];
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  if (tile === "meadow_grass") {
    drawMeadowGrass(graphics, colors);
  } else if (tile === "loam") {
    drawLoam(graphics, colors);
  } else if (tile === "starstone") {
    drawStarstone(graphics, colors);
  } else if (tile === "moon_crystal") {
    drawMoonCrystal(graphics);
  } else if (tile === "meteor_brick") {
    drawMeteorBrick(graphics, colors);
  } else if (tile === "plaza_lamp") {
    drawPlazaLamp(graphics);
  } else {
    graphics.fillStyle(colors.base, 1);
    graphics.fillRect(0, 0, 24, 24);
  }

  graphics.generateTexture(key, 24, 24);
  graphics.destroy();
  return key;
}

export function ensureAvatarTexture(scene: Phaser.Scene, avatarId: string): string {
  const colors = AVATAR_COLORS[avatarId] ?? AVATAR_COLORS.nova!;
  const key = `avatar-${avatarId}`;
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  drawStudentAvatar(graphics, colors, avatarId);
  graphics.generateTexture(key, 22, 32);
  graphics.destroy();
  return key;
}

function drawBlockBase(
  graphics: Phaser.GameObjects.Graphics,
  colors: { base: number; shade: number; highlight: number }
): void {
  graphics.fillStyle(OUTLINE, 1);
  graphics.fillRect(0, 0, 24, 24);
  graphics.fillStyle(colors.base, 1);
  graphics.fillRect(1, 1, 22, 22);
  graphics.fillStyle(colors.shade, 0.86);
  graphics.fillRect(1, 18, 22, 5);
  graphics.fillRect(18, 1, 5, 22);
  graphics.fillStyle(colors.highlight, 0.92);
  graphics.fillRect(3, 3, 11, 2);
  graphics.fillRect(3, 6, 2, 6);
}

function drawMeadowGrass(
  graphics: Phaser.GameObjects.Graphics,
  colors: { base: number; shade: number; highlight: number }
): void {
  drawBlockBase(graphics, colors);
  graphics.fillStyle(0x29412f, 1);
  graphics.fillRect(1, 10, 22, 13);
  graphics.fillStyle(0x4a8a52, 1);
  graphics.fillRect(1, 5, 22, 8);
  graphics.fillStyle(0xb5ef7b, 1);
  for (let x = 1; x < 24; x += 4) {
    graphics.fillRect(x, 1 + ((x / 4) % 2), 2, 7);
  }
  graphics.fillStyle(0x67d18a, 1);
  graphics.fillRect(4, 7, 4, 2);
  graphics.fillRect(15, 6, 5, 2);
  graphics.fillStyle(0xcfffc2, 1);
  graphics.fillRect(11, 4, 1, 2);
  graphics.fillRect(20, 8, 1, 2);
}

function drawLoam(
  graphics: Phaser.GameObjects.Graphics,
  colors: { base: number; shade: number; highlight: number }
): void {
  drawBlockBase(graphics, colors);
  graphics.fillStyle(0x8d664b, 1);
  graphics.fillRect(2, 4, 7, 3);
  graphics.fillRect(12, 11, 9, 2);
  graphics.fillStyle(0x4f342d, 1);
  graphics.fillRect(5, 14, 5, 2);
  graphics.fillRect(16, 18, 3, 2);
  graphics.fillStyle(0xc99b66, 1);
  graphics.fillRect(14, 4, 2, 2);
  graphics.fillRect(8, 19, 1, 1);
  graphics.fillRect(20, 8, 1, 1);
}

function drawStarstone(
  graphics: Phaser.GameObjects.Graphics,
  colors: { base: number; shade: number; highlight: number }
): void {
  drawBlockBase(graphics, colors);
  graphics.fillStyle(0x252c45, 1);
  graphics.fillRect(2, 13, 10, 4);
  graphics.fillRect(13, 5, 8, 6);
  graphics.fillStyle(0x4d5c88, 1);
  graphics.fillRect(4, 4, 6, 2);
  graphics.fillRect(8, 8, 2, 5);
  graphics.fillRect(17, 15, 4, 2);
  graphics.fillStyle(0x8fd6ff, 1);
  graphics.fillRect(15, 6, 1, 1);
  graphics.fillRect(7, 15, 1, 1);
  graphics.fillRect(20, 20, 1, 1);
}

function drawMoonCrystal(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(OUTLINE, 1);
  graphics.fillRect(0, 0, 24, 24);
  graphics.fillStyle(0x202946, 1);
  graphics.fillRect(1, 1, 22, 22);
  graphics.fillStyle(0x354b87, 1);
  graphics.fillRect(3, 17, 18, 5);
  graphics.fillStyle(0x5ac7f7, 1);
  graphics.fillTriangle(12, 2, 20, 19, 5, 19);
  graphics.fillStyle(0x95ecff, 1);
  graphics.fillTriangle(12, 3, 14, 18, 8, 18);
  graphics.fillStyle(0xf2fdff, 1);
  graphics.fillRect(11, 6, 2, 8);
  graphics.fillRect(15, 13, 2, 2);
  graphics.fillStyle(0x2f62be, 1);
  graphics.fillRect(5, 19, 15, 3);
  graphics.fillStyle(0x9ff7ff, 0.55);
  graphics.fillRect(3, 2, 1, 1);
  graphics.fillRect(20, 4, 1, 1);
}

function drawMeteorBrick(
  graphics: Phaser.GameObjects.Graphics,
  colors: { base: number; shade: number; highlight: number }
): void {
  drawBlockBase(graphics, colors);
  graphics.fillStyle(0x6f3440, 1);
  graphics.fillRect(1, 8, 22, 2);
  graphics.fillRect(1, 17, 22, 2);
  graphics.fillRect(7, 1, 2, 8);
  graphics.fillRect(15, 10, 2, 8);
  graphics.fillStyle(0xd97345, 1);
  graphics.fillRect(3, 3, 4, 2);
  graphics.fillRect(17, 12, 4, 2);
  graphics.fillStyle(0xffc270, 1);
  graphics.fillRect(10, 5, 1, 3);
  graphics.fillRect(11, 6, 3, 1);
  graphics.fillRect(19, 19, 1, 2);
}

function drawPlazaLamp(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0xffd66b, 0.18);
  graphics.fillCircle(12, 8, 10);
  graphics.fillStyle(OUTLINE, 1);
  graphics.fillRect(9, 8, 6, 16);
  graphics.fillRect(6, 21, 12, 3);
  graphics.fillStyle(0x6b3b37, 1);
  graphics.fillRect(10, 9, 4, 12);
  graphics.fillStyle(0x2a2033, 1);
  graphics.fillRect(7, 4, 10, 7);
  graphics.fillStyle(0xffc957, 1);
  graphics.fillRect(8, 5, 8, 7);
  graphics.fillStyle(0xfff1a6, 1);
  graphics.fillRect(10, 6, 4, 4);
  graphics.fillStyle(0xf0a64d, 1);
  graphics.fillRect(6, 3, 12, 2);
  graphics.fillRect(11, 1, 2, 3);
}

function drawStudentAvatar(
  graphics: Phaser.GameObjects.Graphics,
  colors: { body: number; trim: number; glow: number },
  avatarId: string
): void {
  const skin = avatarId === "moss" ? 0xd59d77 : 0xf0bf8d;
  const hair = avatarId === "ember" ? 0xb84b35 : avatarId === "violet" ? 0x3b3157 : 0xf0c45d;

  graphics.fillStyle(0x050915, 0.38);
  graphics.fillEllipse(11, 30, 18, 4);
  graphics.fillStyle(OUTLINE, 1);
  graphics.fillRect(5, 8, 12, 16);
  graphics.fillRect(4, 13, 3, 11);
  graphics.fillRect(15, 13, 3, 11);
  graphics.fillRect(6, 23, 4, 6);
  graphics.fillRect(12, 23, 4, 6);

  graphics.fillStyle(colors.body, 1);
  graphics.fillRect(6, 10, 10, 13);
  graphics.fillRect(5, 15, 2, 8);
  graphics.fillRect(15, 15, 2, 8);
  graphics.fillRect(7, 23, 3, 5);
  graphics.fillRect(12, 23, 3, 5);

  graphics.fillStyle(colors.trim, 1);
  graphics.fillRect(5, 9, 12, 4);
  graphics.fillRect(8, 20, 6, 2);
  if (avatarId === "moss") {
    graphics.fillRect(4, 7, 14, 3);
    graphics.fillStyle(0x91d66f, 1);
    graphics.fillRect(6, 5, 10, 3);
  } else if (avatarId === "violet") {
    graphics.fillRect(4, 13, 2, 10);
    graphics.fillRect(16, 13, 2, 10);
  } else {
    graphics.fillRect(7, 5, 8, 5);
  }

  graphics.fillStyle(skin, 1);
  graphics.fillRect(7, 7, 8, 5);
  graphics.fillStyle(hair, 1);
  graphics.fillRect(6, 5, 10, 3);
  graphics.fillRect(6, 8, 2, 3);
  graphics.fillStyle(colors.glow, 1);
  graphics.fillRect(8, 12, 2, 2);
  graphics.fillRect(13, 12, 2, 2);
  graphics.fillStyle(0x172033, 1);
  graphics.fillRect(9, 17, 5, 2);
  graphics.fillStyle(0xeafcff, 1);
  graphics.fillRect(11, 21, 1, 1);
}
