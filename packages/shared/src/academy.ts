import type { SkillId, TaskId } from "./types";

export type AcademyRoomId =
  | "plaza"
  | "classrooms"
  | "dorms"
  | "gardens"
  | "observatory"
  | "crafting-hall";

export type NpcId = "thaddeus" | "mira" | "orin";

export type SocialActivityId =
  | "plaza-greeting"
  | "lesson-circle"
  | "stargazing"
  | "garden-circle"
  | "repair-board"
  | "dorm-story";

export interface AcademyRoomDefinition {
  id: AcademyRoomId;
  label: string;
  shortLabel: string;
  description: string;
  tileX: number;
  tileY: number;
  widthTiles: number;
  heightTiles: number;
  activityId: SocialActivityId;
  hostNpcIds: NpcId[];
}

export interface NpcDefinition {
  id: NpcId;
  name: string;
  role: string;
  roomId: AcademyRoomId;
  tileX: number;
  tileY: number;
  color: string;
  questTaskId: TaskId;
  truth: string;
  greeting: string;
  dialogue: string[];
}

export interface SocialActivityDefinition {
  id: SocialActivityId;
  label: string;
  roomId: AcademyRoomId;
  skill: SkillId;
  taskId: TaskId;
  chatText: string;
}

export const ACADEMY_ROOMS: AcademyRoomDefinition[] = [
  {
    id: "gardens",
    label: "Moonseed Gardens",
    shortLabel: "Gardens",
    description: "A quiet green room where players restore living things after the skyfall.",
    tileX: 24,
    tileY: 20,
    widthTiles: 12,
    heightTiles: 8,
    activityId: "garden-circle",
    hostNpcIds: ["mira"]
  },
  {
    id: "dorms",
    label: "Lantern Dorms",
    shortLabel: "Dorms",
    description: "A cozy social room for stories, emotes, and small character moments.",
    tileX: 37,
    tileY: 18,
    widthTiles: 12,
    heightTiles: 10,
    activityId: "dorm-story",
    hostNpcIds: ["mira"]
  },
  {
    id: "plaza",
    label: "Starfall Plaza",
    shortLabel: "Plaza",
    description: "The public gathering floor of the Academy and the first shared meeting point.",
    tileX: 50,
    tileY: 18,
    widthTiles: 15,
    heightTiles: 10,
    activityId: "plaza-greeting",
    hostNpcIds: ["thaddeus", "mira", "orin"]
  },
  {
    id: "classrooms",
    label: "Truth Classrooms",
    shortLabel: "Classrooms",
    description: "Rooms for lessons, NPC mentorship, and quests about what is breaking in the world.",
    tileX: 66,
    tileY: 18,
    widthTiles: 12,
    heightTiles: 10,
    activityId: "lesson-circle",
    hostNpcIds: ["thaddeus"]
  },
  {
    id: "crafting-hall",
    label: "Crafting Hall",
    shortLabel: "Craft Hall",
    description: "A practical workshop for repairs, blueprints, and collaborative restoration tasks.",
    tileX: 79,
    tileY: 20,
    widthTiles: 13,
    heightTiles: 8,
    activityId: "repair-board",
    hostNpcIds: ["mira"]
  },
  {
    id: "observatory",
    label: "Fallen-Star Observatory",
    shortLabel: "Observatory",
    description: "A high room for stargazing, warnings, and Orin's hard questions about hope.",
    tileX: 53,
    tileY: 8,
    widthTiles: 10,
    heightTiles: 9,
    activityId: "stargazing",
    hostNpcIds: ["orin"]
  }
];

export const ACADEMY_NPCS: NpcDefinition[] = [
  {
    id: "thaddeus",
    name: "Thaddeus",
    role: "Academy mentor",
    roomId: "classrooms",
    tileX: 70,
    tileY: 27,
    color: "#d6b47a",
    questTaskId: "thaddeus-lesson",
    truth: "Courage is not the absence of fear. It is staying useful while fear is present.",
    greeting: "Welcome back, traveler. Mind the cracks in the ceiling. And in everyone else.",
    dialogue: [
      "The Academy was built to teach truth, not comfort. Lately, I fear we may need both.",
      "I tell the students I am not afraid. It is a useful lie, but still a lie.",
      "If you want to help, start by noticing who is quietly carrying too much."
    ]
  },
  {
    id: "mira",
    name: "Mira",
    role: "builder student",
    roomId: "crafting-hall",
    tileX: 84,
    tileY: 27,
    color: "#75d68f",
    questTaskId: "mira-repair",
    truth: "Hope becomes real when someone repairs one small thing anyway.",
    greeting: "If a wall falls, we rebuild it. If a lantern goes out, we make two.",
    dialogue: [
      "People talk like collapse is a storm. Maybe. But storms still leave roofs to fix.",
      "I keep a repair board because panic gets quieter when your hands know what to do.",
      "Bring ideas, blocks, anything. The Academy is not saved by speeches."
    ]
  },
  {
    id: "orin",
    name: "Orin",
    role: "frontier explorer",
    roomId: "observatory",
    tileX: 58,
    tileY: 17,
    color: "#90a8ff",
    questTaskId: "orin-challenge",
    truth: "Hope that cannot face the dark is only decoration.",
    greeting: "You came to look at the stars. Good. Some of them are falling.",
    dialogue: [
      "Everyone downstairs keeps saying rebuild. I have seen towns say that until the last door shut.",
      "Maybe collapse is honest. Maybe the Academy is a candle pretending to be dawn.",
      "Prove me wrong, if you can. I would like that more than I admit."
    ]
  }
];

export const SOCIAL_ACTIVITIES: SocialActivityDefinition[] = [
  {
    id: "plaza-greeting",
    label: "Welcome circle",
    roomId: "plaza",
    skill: "exploration",
    taskId: "academy-social",
    chatText: "joined a welcome circle in Starfall Plaza."
  },
  {
    id: "lesson-circle",
    label: "Join lesson",
    roomId: "classrooms",
    skill: "exploration",
    taskId: "academy-social",
    chatText: "joined a Truth Classrooms lesson."
  },
  {
    id: "stargazing",
    label: "Stargaze",
    roomId: "observatory",
    skill: "exploration",
    taskId: "academy-social",
    chatText: "joined a stargazing watch at the Observatory."
  },
  {
    id: "garden-circle",
    label: "Tend seedlings",
    roomId: "gardens",
    skill: "crafting",
    taskId: "academy-social",
    chatText: "helped tend the Moonseed Gardens."
  },
  {
    id: "repair-board",
    label: "Repair board",
    roomId: "crafting-hall",
    skill: "crafting",
    taskId: "academy-social",
    chatText: "took a repair task from the Crafting Hall board."
  },
  {
    id: "dorm-story",
    label: "Story circle",
    roomId: "dorms",
    skill: "exploration",
    taskId: "academy-social",
    chatText: "joined a Lantern Dorms story circle."
  }
];

export function getAcademyRoom(roomId: string): AcademyRoomDefinition | undefined {
  return ACADEMY_ROOMS.find((room) => room.id === roomId);
}

export function getAcademyNpc(npcId: string): NpcDefinition | undefined {
  return ACADEMY_NPCS.find((npc) => npc.id === npcId);
}

export function getSocialActivity(activityId: string): SocialActivityDefinition | undefined {
  return SOCIAL_ACTIVITIES.find((activity) => activity.id === activityId);
}
