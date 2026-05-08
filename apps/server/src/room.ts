import { Room, type Client } from "colyseus";
import {
  ACTION_COOLDOWN_MS,
  CHAT_COOLDOWN_MS,
  CRAFT_COOLDOWN_MS,
  GRAVITY_PX,
  JUMP_SPEED_PX,
  MAX_CHAT_EVENTS,
  MAX_CLIENTS,
  MAX_FALL_SPEED_PX,
  MOVE_SPEED_PX,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_ID,
  WORLD_NAME,
  WORLD_WIDTH,
  getAcademyNpc,
  getAcademyRoom,
  getSocialActivity,
  addItem,
  addTaskProgress,
  awardSkillXp,
  canMineTile,
  canPlaceTileAt,
  craftItem,
  getTileAt,
  inWorldBounds,
  isAllowedQuickChat,
  isSolidTile,
  isWithinInteractionRange,
  removeItem,
  sanitizeChatMessage,
  spawnPosition,
  tileDrops,
  tileKey,
  tileToMineXp,
  type CompletedTaskBook,
  type CraftItemMessage,
  type EmoteMessage,
  type Inventory,
  type ItemId,
  type JoinOptions,
  type MineTileMessage,
  type PlaceTileMessage,
  type PlayerInputMessage,
  type SocialActivityMessage,
  type SkillBook,
  type TaskProgressBook,
  type TalkNpcMessage,
  type TileType,
  type VisitRoomMessage
} from "@starfall/shared";
import { StarfallDatabase, type PlayerProfile } from "./db";
import { RateLimiter } from "./rate-limit";
import { ChatEventState, PlayerState, StarfallState, TileChangeState } from "./schema";

interface RuntimePlayer {
  profile: PlayerProfile;
  input: PlayerInputMessage;
  lastX: number;
  lastY: number;
  visitedRooms: Set<string>;
  completedActivities: Set<string>;
}

const EMPTY_INPUT: PlayerInputMessage = {
  left: false,
  right: false,
  jump: false
};

export class WorldRoom extends Room<{ state: StarfallState }> {
  override maxClients = MAX_CLIENTS;

  private db!: StarfallDatabase;
  private readonly rateLimiter = new RateLimiter();
  private readonly runtime = new Map<string, RuntimePlayer>();
  private readonly tileChanges = new Map<string, TileType>();

  override onCreate(options: { dbPath?: string } = {}): void {
    this.db = new StarfallDatabase(options.dbPath);
    this.setState(new StarfallState());
    this.state.worldMeta.id = WORLD_ID;
    this.state.worldMeta.name = WORLD_NAME;
    this.state.worldMeta.width = WORLD_WIDTH;
    this.state.worldMeta.height = WORLD_HEIGHT;
    this.state.worldMeta.startedAt = Date.now();

    for (const [key, tile] of this.db.loadTileChanges()) {
      const parts = key.split(",").map(Number);
      const x = parts[0];
      const y = parts[1];
      if (typeof x === "number" && typeof y === "number" && Number.isInteger(x) && Number.isInteger(y)) {
        this.tileChanges.set(key, tile);
        this.state.tileChanges.set(key, makeTileChange(x, y, tile));
      }
    }

    this.onMessage("input", (client, message: PlayerInputMessage) => this.handleInput(client, message));
    this.onMessage("mineTile", (client, message: MineTileMessage) => this.handleMine(client, message));
    this.onMessage("placeTile", (client, message: PlaceTileMessage) => this.handlePlace(client, message));
    this.onMessage("craftItem", (client, message: CraftItemMessage) => this.handleCraft(client, message));
    this.onMessage("chat", (client, message: { text?: string }) => this.handleChat(client, message.text ?? ""));
    this.onMessage("emote", (client, message: EmoteMessage) => this.handleEmote(client, message));
    this.onMessage("talkNpc", (client, message: TalkNpcMessage) => this.handleTalkNpc(client, message));
    this.onMessage("visitRoom", (client, message: VisitRoomMessage) => this.handleVisitRoom(client, message));
    this.onMessage("socialActivity", (client, message: SocialActivityMessage) =>
      this.handleSocialActivity(client, message)
    );
    this.onMessage("acceptTask", () => undefined);

    this.setSimulationInterval((deltaTime) => this.tick(deltaTime), 1000 / 20);
  }

  override onJoin(client: Client, options: JoinOptions): void {
    const profile = this.db.getOrCreateProfile(options.guestId, options.displayName, options.avatarId);
    const player = makePlayerState(profile);
    this.state.players.set(client.sessionId, player);
    this.runtime.set(client.sessionId, {
      profile,
      input: { ...EMPTY_INPUT },
      lastX: player.x,
      lastY: player.y,
      visitedRooms: new Set<string>(),
      completedActivities: new Set<string>()
    });

    this.addSystemChat(`${profile.displayName} arrived at Starfall Academy.`);
  }

  override onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    const runtime = this.runtime.get(client.sessionId);
    if (player && runtime) {
      runtime.profile.x = player.x;
      runtime.profile.y = player.y;
      runtime.profile.inventory = mapToObject(player.inventory);
      runtime.profile.skills = skillsFromState(player);
      runtime.profile.taskProgress = numberMapToObject(player.taskProgress);
      runtime.profile.completedTasks = booleanMapToObject(player.completedTasks);
      this.db.saveProfile(runtime.profile);
      this.addSystemChat(`${player.displayName} left the Academy.`);
    }
    this.state.players.delete(client.sessionId);
    this.runtime.delete(client.sessionId);
    this.rateLimiter.clear(client.sessionId);
  }

  override onDispose(): void {
    for (const [sessionId, runtime] of this.runtime) {
      const player = this.state.players.get(sessionId);
      if (!player) {
        continue;
      }
      runtime.profile.x = player.x;
      runtime.profile.y = player.y;
      runtime.profile.inventory = mapToObject(player.inventory);
      runtime.profile.skills = skillsFromState(player);
      runtime.profile.taskProgress = numberMapToObject(player.taskProgress);
      runtime.profile.completedTasks = booleanMapToObject(player.completedTasks);
      this.db.saveProfile(runtime.profile);
    }
    this.db.close();
  }

  private handleInput(client: Client, message: PlayerInputMessage): void {
    const runtime = this.runtime.get(client.sessionId);
    if (!runtime || typeof message !== "object") {
      return;
    }
    const nextInput: PlayerInputMessage = {
      left: message.left === true,
      right: message.right === true,
      jump: message.jump === true,
      down: message.down === true
    };
    if (Number.isFinite(message.sequence)) {
      nextInput.sequence = Math.floor(message.sequence ?? 0);
    }
    runtime.input = nextInput;
  }

  private handleMine(client: Client, message: MineTileMessage): void {
    if (!this.rateLimiter.canRun(client.sessionId, "mine", ACTION_COOLDOWN_MS)) {
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player || !validTileMessage(message)) {
      return;
    }
    if (!isWithinInteractionRange(player, message.x, message.y)) {
      return;
    }

    const tile = getTileAt(this.tileChanges, message.x, message.y);
    if (!canMineTile(tile)) {
      return;
    }

    const key = tileKey(message.x, message.y);
    this.tileChanges.set(key, "air");
    this.state.tileChanges.set(key, makeTileChange(message.x, message.y, "air"));
    this.db.setTileChange(key, message.x, message.y, "air");

    let inventory = mapToObject(player.inventory);
    for (const [itemId, count] of Object.entries(tileDrops(tile))) {
      inventory = addItem(inventory, itemId as ItemId, count ?? 0);
    }
    setNumberMap(player.inventory, inventory);

    const skills = awardSkillXp(skillsFromState(player), "mining", tileToMineXp(tile));
    setSkills(player, skills);
    this.progressTask(player, "stardust-miner", 1);
    this.savePlayer(client.sessionId);
  }

  private handlePlace(client: Client, message: PlaceTileMessage): void {
    if (!this.rateLimiter.canRun(client.sessionId, "place", ACTION_COOLDOWN_MS)) {
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player || !validTileMessage(message) || typeof message.itemId !== "string") {
      return;
    }
    const itemId = message.itemId as ItemId;
    if (!isWithinInteractionRange(player, message.x, message.y)) {
      return;
    }

    const inventory = mapToObject(player.inventory);
    const result = canPlaceTileAt(this.tileChanges, message.x, message.y, inventory, itemId);
    if (!result.ok) {
      return;
    }
    if (this.intersectsAnyPlayer(message.x, message.y)) {
      return;
    }

    const nextInventory = removeItem(inventory, itemId, 1);
    if (!nextInventory) {
      return;
    }
    const key = tileKey(message.x, message.y);
    this.tileChanges.set(key, result.tile);
    this.state.tileChanges.set(key, makeTileChange(message.x, message.y, result.tile));
    this.db.setTileChange(key, message.x, message.y, result.tile);
    setNumberMap(player.inventory, nextInventory);

    const skills = awardSkillXp(skillsFromState(player), "crafting", 4);
    setSkills(player, skills);
    this.progressTask(player, "cozy-builder", 1);
    this.savePlayer(client.sessionId);
  }

  private handleCraft(client: Client, message: CraftItemMessage): void {
    if (!this.rateLimiter.canRun(client.sessionId, "craft", CRAFT_COOLDOWN_MS)) {
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player || typeof message.itemId !== "string") {
      return;
    }
    const crafted = craftItem(mapToObject(player.inventory), message.itemId);
    if (!crafted) {
      return;
    }

    setNumberMap(player.inventory, crafted.inventory);
    const skills = awardSkillXp(skillsFromState(player), "crafting", crafted.xp);
    setSkills(player, skills);
    if (message.itemId === "star_lantern") {
      this.progressTask(player, "lantern-maker", 1);
    }
    this.savePlayer(client.sessionId);
  }

  private handleChat(client: Client, rawText: string): void {
    if (!this.rateLimiter.canRun(client.sessionId, "chat", CHAT_COOLDOWN_MS)) {
      return;
    }
    const player = this.state.players.get(client.sessionId);
    const runtime = this.runtime.get(client.sessionId);
    if (!player || !runtime) {
      return;
    }

    const text = sanitizeChatMessage(rawText);
    if (!text || (!isAllowedQuickChat(text) && text.length < 2)) {
      return;
    }

    this.db.auditChat(runtime.profile.guestId, player.displayName, text);
    this.pushChat({
      sessionId: client.sessionId,
      displayName: player.displayName,
      text
    });
    this.progressTask(player, "welcome-wave", 1);
    this.savePlayer(client.sessionId);
  }

  private handleEmote(client: Client, message: EmoteMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || typeof message.emoteId !== "string") {
      return;
    }
    if (!["wave", "sparkle", "cheer", "sit"].includes(message.emoteId)) {
      return;
    }
    player.emote = message.emoteId;
    this.progressTask(player, "welcome-wave", 1);
    this.clock.setTimeout(() => {
      const latest = this.state.players.get(client.sessionId);
      if (latest && latest.emote === message.emoteId) {
        latest.emote = "";
      }
    }, 2200);
  }

  private handleTalkNpc(client: Client, message: TalkNpcMessage): void {
    if (!this.rateLimiter.canRun(client.sessionId, "talkNpc", CHAT_COOLDOWN_MS)) {
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player || typeof message.npcId !== "string") {
      return;
    }
    const npc = getAcademyNpc(message.npcId);
    if (!npc) {
      return;
    }

    this.progressTask(player, npc.questTaskId, 1);
    this.pushChat({
      sessionId: "system",
      displayName: npc.name,
      text: npc.greeting
    });
    this.savePlayer(client.sessionId);
  }

  private handleVisitRoom(client: Client, message: VisitRoomMessage): void {
    if (!this.rateLimiter.canRun(client.sessionId, "visitRoom", ACTION_COOLDOWN_MS)) {
      return;
    }
    const player = this.state.players.get(client.sessionId);
    const runtime = this.runtime.get(client.sessionId);
    if (!player || !runtime || typeof message.roomId !== "string") {
      return;
    }
    const academyRoom = getAcademyRoom(message.roomId);
    if (!academyRoom || runtime.visitedRooms.has(academyRoom.id)) {
      return;
    }

    runtime.visitedRooms.add(academyRoom.id);
    this.progressTask(player, "academy-tour", 1);
    this.pushChat({
      sessionId: "system",
      displayName: "Academy",
      text: `${player.displayName} visited ${academyRoom.label}.`
    });
    this.savePlayer(client.sessionId);
  }

  private handleSocialActivity(client: Client, message: SocialActivityMessage): void {
    if (!this.rateLimiter.canRun(client.sessionId, "socialActivity", CRAFT_COOLDOWN_MS)) {
      return;
    }
    const player = this.state.players.get(client.sessionId);
    const runtime = this.runtime.get(client.sessionId);
    if (!player || !runtime || typeof message.activityId !== "string") {
      return;
    }
    const activity = getSocialActivity(message.activityId);
    if (!activity || runtime.completedActivities.has(activity.id)) {
      return;
    }

    runtime.completedActivities.add(activity.id);
    this.progressTask(player, activity.taskId, 1);
    const skills = awardSkillXp(skillsFromState(player), activity.skill, 6);
    setSkills(player, skills);
    this.pushChat({
      sessionId: "system",
      displayName: "Academy",
      text: `${player.displayName} ${activity.chatText}`
    });
    this.savePlayer(client.sessionId);
  }

  private tick(deltaTimeMs: number): void {
    const dt = Math.min(deltaTimeMs / 1000, 0.05);
    for (const [sessionId, runtime] of this.runtime) {
      const player = this.state.players.get(sessionId);
      if (!player) {
        continue;
      }

      const input = runtime.input;
      const direction = Number(input.right) - Number(input.left);
      player.vx = direction * MOVE_SPEED_PX;
      if (direction < 0) {
        player.facing = "left";
      } else if (direction > 0) {
        player.facing = "right";
      }

      if (input.jump && player.onGround) {
        player.vy = -JUMP_SPEED_PX;
        player.onGround = false;
      }

      player.vy = Math.min(MAX_FALL_SPEED_PX, player.vy + GRAVITY_PX * dt);
      this.movePlayer(player, player.vx * dt, 0);
      this.movePlayer(player, 0, player.vy * dt);

      const distance = Math.abs(player.x - runtime.lastX) + Math.abs(player.y - runtime.lastY);
      if (distance > 1) {
        this.progressTask(player, "first-steps", distance * 0.015);
      }
      runtime.lastX = player.x;
      runtime.lastY = player.y;
    }
  }

  private movePlayer(player: PlayerState, dx: number, dy: number): void {
    if (dx !== 0) {
      const nextX = clamp(player.x + dx, PLAYER_WIDTH / 2, WORLD_WIDTH * TILE_SIZE - PLAYER_WIDTH / 2);
      if (!this.collides(nextX, player.y)) {
        player.x = nextX;
      } else {
        player.vx = 0;
      }
    }

    if (dy !== 0) {
      const nextY = clamp(player.y + dy, PLAYER_HEIGHT / 2, WORLD_HEIGHT * TILE_SIZE - PLAYER_HEIGHT / 2);
      if (!this.collides(player.x, nextY)) {
        player.y = nextY;
        player.onGround = false;
      } else {
        if (dy > 0) {
          player.onGround = true;
        }
        player.vy = 0;
      }
    }
  }

  private collides(x: number, y: number): boolean {
    const left = Math.floor((x - PLAYER_WIDTH / 2) / TILE_SIZE);
    const right = Math.floor((x + PLAYER_WIDTH / 2 - 1) / TILE_SIZE);
    const top = Math.floor((y - PLAYER_HEIGHT / 2) / TILE_SIZE);
    const bottom = Math.floor((y + PLAYER_HEIGHT / 2 - 1) / TILE_SIZE);

    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (!inWorldBounds(tx, ty) || isSolidTile(getTileAt(this.tileChanges, tx, ty))) {
          return true;
        }
      }
    }
    return false;
  }

  private intersectsAnyPlayer(tileX: number, tileY: number): boolean {
    const x1 = tileX * TILE_SIZE;
    const y1 = tileY * TILE_SIZE;
    const x2 = x1 + TILE_SIZE;
    const y2 = y1 + TILE_SIZE;

    for (const player of this.state.players.values()) {
      const px1 = player.x - PLAYER_WIDTH / 2;
      const py1 = player.y - PLAYER_HEIGHT / 2;
      const px2 = player.x + PLAYER_WIDTH / 2;
      const py2 = player.y + PLAYER_HEIGHT / 2;
      if (x1 < px2 && x2 > px1 && y1 < py2 && y2 > py1) {
        return true;
      }
    }
    return false;
  }

  private progressTask(player: PlayerState, taskId: string, amount: number): void {
    const current = numberMapToObject(player.taskProgress);
    const completed = booleanMapToObject(player.completedTasks);
    const result = addTaskProgress(current, completed, taskId, amount);
    setNumberMap(player.taskProgress, result.progress);
    setBooleanMap(player.completedTasks, result.completed);
    if (result.newlyCompleted) {
      const skills = awardSkillXp(skillsFromState(player), result.newlyCompleted.skill, result.newlyCompleted.xp);
      setSkills(player, skills);
      this.pushChat({
        sessionId: "system",
        displayName: "Path",
        text: `${player.displayName} completed ${result.newlyCompleted.label}.`
      });
    }
  }

  private addSystemChat(text: string): void {
    this.pushChat({
      sessionId: "system",
      displayName: "Meadow",
      text
    });
  }

  private pushChat(event: { sessionId: string; displayName: string; text: string }): void {
    const chat = new ChatEventState();
    chat.id = crypto.randomUUID();
    chat.sessionId = event.sessionId;
    chat.displayName = event.displayName;
    chat.text = event.text;
    chat.sentAt = Date.now();
    this.state.chatEvents.push(chat);
    while (this.state.chatEvents.length > MAX_CHAT_EVENTS) {
      this.state.chatEvents.shift();
    }
  }

  private savePlayer(sessionId: string): void {
    const runtime = this.runtime.get(sessionId);
    const player = this.state.players.get(sessionId);
    if (!runtime || !player) {
      return;
    }
    runtime.profile.x = player.x;
    runtime.profile.y = player.y;
    runtime.profile.inventory = mapToObject(player.inventory);
    runtime.profile.skills = skillsFromState(player);
    runtime.profile.taskProgress = numberMapToObject(player.taskProgress);
    runtime.profile.completedTasks = booleanMapToObject(player.completedTasks);
    this.db.saveProfile(runtime.profile);
  }
}

function makePlayerState(profile: PlayerProfile): PlayerState {
  const player = new PlayerState();
  player.guestId = profile.guestId;
  player.displayName = profile.displayName;
  player.avatarId = profile.avatarId;
  player.x = profile.x;
  player.y = profile.y;
  player.vx = 0;
  player.vy = 0;
  setNumberMap(player.inventory, profile.inventory);
  setSkills(player, profile.skills);
  setNumberMap(player.taskProgress, profile.taskProgress);
  setBooleanMap(player.completedTasks, profile.completedTasks);
  return player;
}

function makeTileChange(x: number, y: number, tile: TileType): TileChangeState {
  const change = new TileChangeState();
  change.x = x;
  change.y = y;
  change.tile = tile;
  return change;
}

function validTileMessage(message: { x?: unknown; y?: unknown }): message is { x: number; y: number } {
  return (
    typeof message.x === "number" &&
    typeof message.y === "number" &&
    Number.isInteger(message.x) &&
    Number.isInteger(message.y) &&
    inWorldBounds(message.x, message.y)
  );
}

function setNumberMap(map: { clear: () => void; set: (key: string, value: number) => unknown }, values: Record<string, number>): void {
  map.clear();
  for (const [key, value] of Object.entries(values)) {
    map.set(key, Number.isFinite(value) ? value : 0);
  }
}

function setBooleanMap(
  map: { clear: () => void; set: (key: string, value: boolean) => unknown },
  values: Record<string, boolean>
): void {
  map.clear();
  for (const [key, value] of Object.entries(values)) {
    map.set(key, value === true);
  }
}

function setSkills(player: PlayerState, skills: SkillBook): void {
  const xp = {
    mining: skills.mining.xp,
    crafting: skills.crafting.xp,
    exploration: skills.exploration.xp
  };
  const level = {
    mining: skills.mining.level,
    crafting: skills.crafting.level,
    exploration: skills.exploration.level
  };
  setNumberMap(player.skillsXp, xp);
  setNumberMap(player.skillsLevel, level);
}

function mapToObject(map: Iterable<[string, number]>): Inventory {
  return Object.fromEntries([...map].map(([key, value]) => [key, Math.max(0, Math.floor(value))]));
}

function numberMapToObject(map: Iterable<[string, number]>): TaskProgressBook {
  return Object.fromEntries([...map].map(([key, value]) => [key, Number.isFinite(value) ? value : 0]));
}

function booleanMapToObject(map: Iterable<[string, boolean]>): CompletedTaskBook {
  return Object.fromEntries([...map].map(([key, value]) => [key, value === true]));
}

function skillsFromState(player: PlayerState): SkillBook {
  return {
    mining: {
      xp: player.skillsXp.get("mining") ?? 0,
      level: player.skillsLevel.get("mining") ?? 1
    },
    crafting: {
      xp: player.skillsXp.get("crafting") ?? 0,
      level: player.skillsLevel.get("crafting") ?? 1
    },
    exploration: {
      xp: player.skillsXp.get("exploration") ?? 0,
      level: player.skillsLevel.get("exploration") ?? 1
    }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
