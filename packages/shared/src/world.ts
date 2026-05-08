import {
  INTERACTION_RANGE_PX,
  SAFE_PLAZA,
  SPAWN_TILE_X,
  SPAWN_TILE_Y,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from "./constants";
import { ITEM_DEFINITIONS, TILE_DEFINITIONS } from "./items";
import type { Inventory, ItemId, TileType, WorldPosition } from "./types";

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseTileKey(key: string): { x: number; y: number } | null {
  const parts = key.split(",").map(Number);
  const x = parts[0];
  const y = parts[1];
  if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
    return null;
  }
  return { x, y };
}

export function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function terrainHeightAt(x: number): number {
  const rolling = Math.sin(x / 6) * 2.1 + Math.sin(x / 13) * 2.8;
  const sparkle = seededNoise(x + 41) * 2 - 1;
  return Math.round(31 + rolling + sparkle);
}

export function getBaseTile(x: number, y: number): TileType {
  if (!inWorldBounds(x, y)) {
    return "starstone";
  }

  if (x >= SAFE_PLAZA.x1 && x <= SAFE_PLAZA.x2) {
    if (y < SAFE_PLAZA.surfaceY) {
      if ((x === 27 || x === 46 || x === 62 || x === 76 || x === 90) && y === SAFE_PLAZA.surfaceY - 1) {
        return "plaza_lamp";
      }
      return "air";
    }
    if (y === SAFE_PLAZA.surfaceY) {
      return "meteor_brick";
    }
    if (y < SAFE_PLAZA.surfaceY + 4) {
      return "loam";
    }
    return "starstone";
  }

  const surface = terrainHeightAt(x);
  if (y < surface) {
    return "air";
  }
  if (y === surface) {
    return "meadow_grass";
  }
  if (y < surface + 5) {
    return "loam";
  }

  const crystalNoise = seededNoise(x * 17 + y * 31);
  if (y > surface + 6 && crystalNoise > 0.92) {
    return "moon_crystal";
  }

  return "starstone";
}

export function getTileAt(changes: Map<string, TileType> | Record<string, TileType>, x: number, y: number): TileType {
  const key = tileKey(x, y);
  const changed = changes instanceof Map ? changes.get(key) : changes[key];
  return changed ?? getBaseTile(x, y);
}

export function inWorldBounds(x: number, y: number): boolean {
  return x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT;
}

export function isSolidTile(tile: TileType): boolean {
  return TILE_DEFINITIONS[tile]?.solid ?? false;
}

export function canMineTile(tile: TileType): boolean {
  return TILE_DEFINITIONS[tile]?.mineable ?? false;
}

export function itemToPlaceTile(itemId: ItemId): TileType | null {
  return ITEM_DEFINITIONS[itemId]?.placeTile ?? null;
}

export function tileDrops(tile: TileType): Partial<Record<ItemId, number>> {
  return TILE_DEFINITIONS[tile]?.drops ?? {};
}

export function tileToMineXp(tile: TileType): number {
  return Math.max(2, (TILE_DEFINITIONS[tile]?.hardness ?? 1) * 8);
}

export function pixelToTile(value: number): number {
  return Math.floor(value / TILE_SIZE);
}

export function tileCenter(x: number, y: number): WorldPosition {
  return {
    x: x * TILE_SIZE + TILE_SIZE / 2,
    y: y * TILE_SIZE + TILE_SIZE / 2
  };
}

export function spawnPosition(): WorldPosition {
  return {
    x: SPAWN_TILE_X * TILE_SIZE,
    y: SPAWN_TILE_Y * TILE_SIZE
  };
}

export function isWithinInteractionRange(player: WorldPosition, tileX: number, tileY: number): boolean {
  const center = tileCenter(tileX, tileY);
  const dx = center.x - player.x;
  const dy = center.y - player.y;
  return Math.hypot(dx, dy) <= INTERACTION_RANGE_PX;
}

export function canPlaceTileAt(
  changes: Map<string, TileType> | Record<string, TileType>,
  tileX: number,
  tileY: number,
  inventory: Inventory,
  itemId: ItemId
): { ok: true; tile: TileType } | { ok: false; reason: string } {
  if (!inWorldBounds(tileX, tileY)) {
    return { ok: false, reason: "Out of bounds" };
  }
  if ((inventory[itemId] ?? 0) <= 0) {
    return { ok: false, reason: "Missing item" };
  }
  const placeTile = itemToPlaceTile(itemId);
  if (!placeTile) {
    return { ok: false, reason: "Item is not placeable" };
  }
  if (getTileAt(changes, tileX, tileY) !== "air") {
    return { ok: false, reason: "Tile is occupied" };
  }
  return { ok: true, tile: placeTile };
}

export function generateWorldSnapshot(changes: Record<string, TileType> = {}): TileType[][] {
  return Array.from({ length: WORLD_HEIGHT }, (_, y) =>
    Array.from({ length: WORLD_WIDTH }, (_, x) => changes[tileKey(x, y)] ?? getBaseTile(x, y))
  );
}
