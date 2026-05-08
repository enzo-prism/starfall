import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") guestId = "";
  @type("string") displayName = "";
  @type("string") avatarId = "nova";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("boolean") onGround = false;
  @type("string") facing = "right";
  @type("string") emote = "";
  @type({ map: "number" }) inventory = new MapSchema<number>();
  @type({ map: "number" }) skillsXp = new MapSchema<number>();
  @type({ map: "number" }) skillsLevel = new MapSchema<number>();
  @type({ map: "number" }) taskProgress = new MapSchema<number>();
  @type({ map: "boolean" }) completedTasks = new MapSchema<boolean>();
}

export class TileChangeState extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") tile = "air";
}

export class DroppedItemState extends Schema {
  @type("string") itemId = "";
  @type("number") count = 1;
  @type("number") x = 0;
  @type("number") y = 0;
}

export class ChatEventState extends Schema {
  @type("string") id = "";
  @type("string") sessionId = "";
  @type("string") displayName = "";
  @type("string") text = "";
  @type("number") sentAt = 0;
}

export class WorldMetaState extends Schema {
  @type("string") id = "starfall-academy";
  @type("string") name = "Starfall Academy";
  @type("number") width = 0;
  @type("number") height = 0;
  @type("number") startedAt = Date.now();
}

export class StarfallState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: TileChangeState }) tileChanges = new MapSchema<TileChangeState>();
  @type({ map: DroppedItemState }) droppedItems = new MapSchema<DroppedItemState>();
  @type([ChatEventState]) chatEvents = new ArraySchema<ChatEventState>();
  @type(WorldMetaState) worldMeta = new WorldMetaState();
}
