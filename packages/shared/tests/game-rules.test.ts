import { describe, expect, it } from "vitest";
import {
  ACADEMY_NPCS,
  ACADEMY_ROOMS,
  RECIPES,
  SOCIAL_ACTIVITIES,
  WORLD_NAME,
  addItem,
  addTaskProgress,
  canMineTile,
  canPlaceTileAt,
  craftItem,
  createStarterCompletedTasks,
  createStarterInventory,
  createStarterTaskProgress,
  getBaseTile,
  getQuickChatOptions,
  getTileAt,
  sanitizeChatMessage,
  sanitizeDisplayName,
  tileKey
} from "../src";

describe("world generation", () => {
  it("generates deterministic tiles", () => {
    const sample = Array.from({ length: 20 }, (_, index) => getBaseTile(index + 12, 33));
    const repeated = Array.from({ length: 20 }, (_, index) => getBaseTile(index + 12, 33));
    expect(repeated).toEqual(sample);
  });

  it("applies changed tiles over the generated base", () => {
    const key = tileKey(10, 10);
    expect(getTileAt({ [key]: "air" }, 10, 10)).toBe("air");
  });
});

describe("inventory and crafting", () => {
  it("adds, removes, and crafts with recipe inputs", () => {
    let inventory = createStarterInventory();
    inventory = addItem(inventory, "moon_crystal", 1);
    inventory = addItem(inventory, "star_dust", 2);
    const crafted = craftItem(inventory, "star_lantern");
    expect(crafted).not.toBeNull();
    expect(crafted?.inventory.star_lantern).toBe(1);
    expect(crafted?.xp).toBe(RECIPES.star_lantern?.craftingXp);
  });

  it("rejects placement when inventory is missing or target is occupied", () => {
    expect(canPlaceTileAt({}, 4, 4, {}, "loam_block").ok).toBe(false);
    expect(canPlaceTileAt({ [tileKey(4, 4)]: "starstone" }, 4, 4, { loam_block: 1 }, "loam_block").ok).toBe(false);
    expect(canPlaceTileAt({ [tileKey(4, 4)]: "air" }, 4, 4, { loam_block: 1 }, "loam_block").ok).toBe(true);
  });
});

describe("progression", () => {
  it("completes a task once its target is reached", () => {
    const progress = createStarterTaskProgress();
    const completed = createStarterCompletedTasks();
    const result = addTaskProgress(progress, completed, "stardust-miner", 3);
    expect(result.completed["stardust-miner"]).toBe(true);
    expect(result.newlyCompleted?.id).toBe("stardust-miner");
  });

  it("ships Starfall Academy rooms with NPC hosts, social activities, and quests", () => {
    expect(WORLD_NAME).toBe("Starfall Academy");
    expect(ACADEMY_ROOMS.map((room) => room.id)).toEqual([
      "gardens",
      "dorms",
      "plaza",
      "classrooms",
      "crafting-hall",
      "observatory"
    ]);

    for (const room of ACADEMY_ROOMS) {
      expect(room.hostNpcIds.length).toBeGreaterThan(0);
      expect(SOCIAL_ACTIVITIES.some((activity) => activity.id === room.activityId && activity.roomId === room.id)).toBe(
        true
      );
      expect(room.hostNpcIds.every((npcId) => ACADEMY_NPCS.some((npc) => npc.id === npcId))).toBe(true);
    }

    expect(ACADEMY_NPCS.map((npc) => npc.id)).toEqual(["thaddeus", "mira", "orin"]);
    expect(ACADEMY_NPCS.every((npc) => npc.questTaskId in createStarterTaskProgress())).toBe(true);
  });
});

describe("safety", () => {
  it("sanitizes display names and chat", () => {
    expect(sanitizeDisplayName("<Nova!!!>")).toBe("Nova");
    expect(sanitizeChatMessage("visit https://example.com now")).toContain("********");
  });

  it("allows shipped quick chat phrases", () => {
    expect(getQuickChatOptions().every((option) => sanitizeChatMessage(option) === option)).toBe(true);
  });

  it("knows which tiles are mineable", () => {
    expect(canMineTile("air")).toBe(false);
    expect(canMineTile("loam")).toBe(true);
  });
});
