export const TILE_SIZE = 24;
export const WORLD_ID = "starfall-academy";
export const WORLD_NAME = "Starfall Academy";
export const WORLD_WIDTH = 112;
export const WORLD_HEIGHT = 60;
export const SPAWN_TILE_X = 52;
export const SPAWN_TILE_Y = 27;
export const PLAYER_WIDTH = 18;
export const PLAYER_HEIGHT = 30;
export const MAX_CLIENTS = 24;
export const MAX_CHAT_EVENTS = 34;
export const MAX_DISPLAY_NAME_LENGTH = 18;
export const MAX_CHAT_LENGTH = 96;
export const CHAT_COOLDOWN_MS = 900;
export const ACTION_COOLDOWN_MS = 125;
export const CRAFT_COOLDOWN_MS = 500;
export const INTERACTION_RANGE_PX = TILE_SIZE * 5;
export const MOVE_SPEED_PX = 170;
export const JUMP_SPEED_PX = 410;
export const GRAVITY_PX = 980;
export const MAX_FALL_SPEED_PX = 620;

export const SAFE_PLAZA = {
  x1: 20,
  x2: 94,
  surfaceY: 29
} as const;
