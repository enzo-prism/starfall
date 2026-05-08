import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  WORLD_ID,
  createStarterCompletedTasks,
  createStarterInventory,
  createStarterSkills,
  createStarterTaskProgress,
  normalizeInventory,
  sanitizeDisplayName,
  spawnPosition,
  type CompletedTaskBook,
  type Inventory,
  type SkillBook,
  type TaskProgressBook,
  type TileType
} from "@starfall/shared";

interface ProfileRow {
  guest_id: string;
  display_name: string;
  avatar_id: string;
  x: number;
  y: number;
  inventory_json: string;
  skills_json: string;
  task_progress_json: string;
  completed_tasks_json: string;
}

interface TileChangeRow {
  tile_key: string;
  tile: string;
}

export interface PlayerProfile {
  guestId: string;
  displayName: string;
  avatarId: string;
  x: number;
  y: number;
  inventory: Inventory;
  skills: SkillBook;
  taskProgress: TaskProgressBook;
  completedTasks: CompletedTaskBook;
}

export class StarfallDatabase {
  private readonly db: DatabaseSync;

  constructor(filePath = process.env.STARFALL_DB_PATH ?? resolve(process.cwd(), "starfall.sqlite")) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  getOrCreateProfile(guestId: string, displayName: string, avatarId: string): PlayerProfile {
    const safeGuestId = guestId.replace(/[^\w-]/g, "").slice(0, 64) || crypto.randomUUID();
    const existing = this.db
      .prepare("SELECT * FROM player_profiles WHERE guest_id = ?")
      .get(safeGuestId) as ProfileRow | undefined;

    if (existing) {
      const profile = this.rowToProfile(existing);
      const nextName = sanitizeDisplayName(displayName || profile.displayName);
      const nextAvatar = avatarId.replace(/[^\w-]/g, "").slice(0, 24) || profile.avatarId;
      if (nextName !== profile.displayName || nextAvatar !== profile.avatarId) {
        profile.displayName = nextName;
        profile.avatarId = nextAvatar;
        this.saveProfile(profile);
      }
      return profile;
    }

    const spawn = spawnPosition();
    const profile: PlayerProfile = {
      guestId: safeGuestId,
      displayName: sanitizeDisplayName(displayName),
      avatarId: avatarId.replace(/[^\w-]/g, "").slice(0, 24) || "nova",
      x: spawn.x,
      y: spawn.y,
      inventory: createStarterInventory(),
      skills: createStarterSkills(),
      taskProgress: createStarterTaskProgress(),
      completedTasks: createStarterCompletedTasks()
    };
    this.saveProfile(profile);
    return profile;
  }

  saveProfile(profile: PlayerProfile): void {
    this.db
      .prepare(
        `INSERT INTO player_profiles (
          guest_id, display_name, avatar_id, x, y, inventory_json, skills_json,
          task_progress_json, completed_tasks_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
        ON CONFLICT(guest_id) DO UPDATE SET
          display_name = excluded.display_name,
          avatar_id = excluded.avatar_id,
          x = excluded.x,
          y = excluded.y,
          inventory_json = excluded.inventory_json,
          skills_json = excluded.skills_json,
          task_progress_json = excluded.task_progress_json,
          completed_tasks_json = excluded.completed_tasks_json,
          updated_at = unixepoch()`
      )
      .run(
        profile.guestId,
        profile.displayName,
        profile.avatarId,
        profile.x,
        profile.y,
        JSON.stringify(normalizeInventory(profile.inventory)),
        JSON.stringify(profile.skills),
        JSON.stringify(profile.taskProgress),
        JSON.stringify(profile.completedTasks)
      );
  }

  loadTileChanges(worldId = WORLD_ID): Map<string, TileType> {
    const rows = this.db
      .prepare("SELECT tile_key, tile FROM world_tile_changes WHERE world_id = ?")
      .all(worldId) as unknown as TileChangeRow[];
    return new Map(rows.map((row) => [row.tile_key, row.tile as TileType]));
  }

  setTileChange(key: string, x: number, y: number, tile: TileType, worldId = WORLD_ID): void {
    this.db
      .prepare(
        `INSERT INTO world_tile_changes (world_id, tile_key, x, y, tile, updated_at)
        VALUES (?, ?, ?, ?, ?, unixepoch())
        ON CONFLICT(world_id, tile_key) DO UPDATE SET
          x = excluded.x,
          y = excluded.y,
          tile = excluded.tile,
          updated_at = unixepoch()`
      )
      .run(worldId, key, x, y, tile);
  }

  auditChat(guestId: string, displayName: string, text: string): void {
    this.db
      .prepare(
        `INSERT INTO chat_audit_events (guest_id, display_name, text, created_at)
        VALUES (?, ?, ?, unixepoch())`
      )
      .run(guestId, displayName, text);
  }

  snapshot(worldId = WORLD_ID): { worldId: string; tileChanges: Record<string, TileType>; profiles: number } {
    const changes = Object.fromEntries(this.loadTileChanges(worldId));
    const profileCount = this.db.prepare("SELECT COUNT(*) as count FROM player_profiles").get() as { count: number };
    return {
      worldId,
      tileChanges: changes,
      profiles: profileCount.count
    };
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        guest_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        avatar_id TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        inventory_json TEXT NOT NULL,
        skills_json TEXT NOT NULL,
        task_progress_json TEXT NOT NULL,
        completed_tasks_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS world_tile_changes (
        world_id TEXT NOT NULL,
        tile_key TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        tile TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (world_id, tile_key)
      );

      CREATE TABLE IF NOT EXISTS inventory_slots (
        guest_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        count INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (guest_id, item_id)
      );

      CREATE TABLE IF NOT EXISTS skill_progress (
        guest_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        xp INTEGER NOT NULL,
        level INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (guest_id, skill_id)
      );

      CREATE TABLE IF NOT EXISTS chat_audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  private rowToProfile(row: ProfileRow): PlayerProfile {
    return {
      guestId: row.guest_id,
      displayName: row.display_name,
      avatarId: row.avatar_id,
      x: row.x,
      y: row.y,
      inventory: normalizeInventory(parseJson(row.inventory_json, createStarterInventory())),
      skills: parseJson(row.skills_json, createStarterSkills()),
      taskProgress: parseJson(row.task_progress_json, createStarterTaskProgress()),
      completedTasks: parseJson(row.completed_tasks_json, createStarterCompletedTasks())
    };
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
