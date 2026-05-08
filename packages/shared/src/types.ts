export type Direction = "left" | "right";

export type TileType =
  | "air"
  | "meadow_grass"
  | "loam"
  | "starstone"
  | "moon_crystal"
  | "meteor_brick"
  | "plaza_lamp";

export type ItemId =
  | "loam_block"
  | "starstone_block"
  | "moon_crystal"
  | "star_dust"
  | "meteor_brick"
  | "star_lantern";

export type SkillId = "mining" | "crafting" | "exploration";

export type TaskId =
  | "welcome-wave"
  | "first-steps"
  | "stardust-miner"
  | "cozy-builder"
  | "lantern-maker"
  | "academy-tour"
  | "thaddeus-lesson"
  | "mira-repair"
  | "orin-challenge"
  | "academy-social";

export type EmoteId = "wave" | "sparkle" | "cheer" | "sit";

export interface WorldPosition {
  x: number;
  y: number;
}

export interface PlayerInputMessage {
  left: boolean;
  right: boolean;
  jump: boolean;
  down?: boolean;
  sequence?: number;
}

export interface MineTileMessage {
  x: number;
  y: number;
}

export interface PlaceTileMessage {
  x: number;
  y: number;
  itemId: ItemId;
}

export interface CraftItemMessage {
  itemId: ItemId;
}

export interface ChatMessage {
  text: string;
}

export interface EmoteMessage {
  emoteId: EmoteId;
}

export interface TalkNpcMessage {
  npcId: string;
}

export interface VisitRoomMessage {
  roomId: string;
}

export interface SocialActivityMessage {
  activityId: string;
}

export interface JoinOptions {
  guestId: string;
  displayName: string;
  avatarId: string;
}

export interface Inventory {
  [itemId: string]: number;
}

export interface SkillProgress {
  xp: number;
  level: number;
}

export interface SkillBook {
  mining: SkillProgress;
  crafting: SkillProgress;
  exploration: SkillProgress;
}

export interface TaskProgressBook {
  [taskId: string]: number;
}

export interface CompletedTaskBook {
  [taskId: string]: boolean;
}

export interface TileDefinition {
  id: TileType;
  label: string;
  solid: boolean;
  mineable: boolean;
  hardness: number;
  drops: Partial<Record<ItemId, number>>;
  placeItem?: ItemId;
}

export interface ItemDefinition {
  id: ItemId;
  label: string;
  description: string;
  placeTile?: TileType;
  maxStack: number;
}

export interface RecipeDefinition {
  output: ItemId;
  label: string;
  inputs: Partial<Record<ItemId, number>>;
  craftingXp: number;
}

export interface TaskDefinition {
  id: TaskId;
  label: string;
  detail: string;
  target: number;
  skill: SkillId;
  xp: number;
}
