import Phaser from "phaser";
import type { TileType } from "@starfall/shared";
export { avatarOptions } from "./avatar-options";

const TILE_COLORS: Record<TileType, { base: number; shade: number; highlight: number }> = {
  air: { base: 0x000000, shade: 0x000000, highlight: 0x000000 },
  meadow_grass: { base: 0x4caa68, shade: 0x2e6d58, highlight: 0xa8e178 },
  loam: { base: 0x755641, shade: 0x48342f, highlight: 0xb8875c },
  starstone: { base: 0x364266, shade: 0x22283f, highlight: 0x6c7fb6 },
  moon_crystal: { base: 0x8ad8ff, shade: 0x365aa8, highlight: 0xe8fbff },
  meteor_brick: { base: 0xa85645, shade: 0x5b2f3d, highlight: 0xf2a65f },
  plaza_lamp: { base: 0xffd66b, shade: 0x814a3f, highlight: 0xfff1a6 }
};

const AVATAR_COLORS: Record<string, { body: number; trim: number; glow: number }> = {
  nova: { body: 0x4fc3f7, trim: 0xf4d35e, glow: 0xe9fffb },
  ember: { body: 0xff7a59, trim: 0x90e0ef, glow: 0xfff0cf },
  moss: { body: 0x78c56e, trim: 0xf6bd60, glow: 0xedffd4 },
  violet: { body: 0x9b7bff, trim: 0xffafcc, glow: 0xf6e8ff }
};

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
  graphics.fillStyle(colors.base, 1);
  graphics.fillRect(0, 0, 24, 24);
  graphics.fillStyle(colors.shade, 0.72);
  graphics.fillRect(0, 18, 24, 6);
  graphics.fillRect(18, 0, 6, 24);
  graphics.fillStyle(colors.highlight, 0.9);
  graphics.fillRect(2, 2, 14, 3);
  graphics.fillRect(2, 6, 3, 9);

  if (tile === "meadow_grass") {
    graphics.fillStyle(0xc9ff8d, 1);
    for (let x = 1; x < 24; x += 5) {
      graphics.fillRect(x, 0, 2, 5);
    }
  }

  if (tile === "moon_crystal") {
    graphics.clear();
    graphics.fillStyle(0x22314f, 1);
    graphics.fillRect(0, 0, 24, 24);
    graphics.fillStyle(0x65caff, 1);
    graphics.fillTriangle(12, 2, 20, 18, 5, 18);
    graphics.fillStyle(0xe8fbff, 1);
    graphics.fillRect(11, 6, 3, 8);
    graphics.fillStyle(0x4762d0, 1);
    graphics.fillRect(5, 18, 15, 4);
  }

  if (tile === "plaza_lamp") {
    graphics.clear();
    graphics.fillStyle(0x5b2f3d, 1);
    graphics.fillRect(10, 9, 4, 15);
    graphics.fillStyle(0xffd66b, 1);
    graphics.fillRect(6, 3, 12, 9);
    graphics.fillStyle(0xfff1a6, 1);
    graphics.fillRect(9, 5, 6, 4);
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
  graphics.fillStyle(0x10172d, 0.4);
  graphics.fillEllipse(9, 29, 17, 4);
  graphics.fillStyle(colors.body, 1);
  graphics.fillRect(5, 9, 9, 14);
  graphics.fillRect(4, 14, 3, 10);
  graphics.fillRect(12, 14, 3, 10);
  graphics.fillRect(6, 23, 3, 5);
  graphics.fillRect(11, 23, 3, 5);
  graphics.fillStyle(colors.trim, 1);
  graphics.fillRect(4, 8, 11, 4);
  graphics.fillRect(6, 5, 7, 5);
  graphics.fillStyle(colors.glow, 1);
  graphics.fillRect(7, 13, 2, 2);
  graphics.fillRect(12, 13, 2, 2);
  graphics.fillStyle(0x1a2036, 1);
  graphics.fillRect(8, 19, 5, 2);
  graphics.generateTexture(key, 18, 30);
  graphics.destroy();
  return key;
}
