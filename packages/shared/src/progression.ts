import type { CompletedTaskBook, SkillBook, SkillId, TaskDefinition, TaskProgressBook } from "./types";

export const TASKS: TaskDefinition[] = [
  {
    id: "welcome-wave",
    label: "Say hello",
    detail: "Send one public chat or emote in Starfall Academy.",
    target: 1,
    skill: "exploration",
    xp: 10
  },
  {
    id: "first-steps",
    label: "First steps",
    detail: "Walk across the Academy grounds and get your bearings.",
    target: 180,
    skill: "exploration",
    xp: 16
  },
  {
    id: "stardust-miner",
    label: "Stardust miner",
    detail: "Mine three soft blocks or crystals.",
    target: 3,
    skill: "mining",
    xp: 24
  },
  {
    id: "cozy-builder",
    label: "Cozy builder",
    detail: "Place two blocks near the Academy.",
    target: 2,
    skill: "crafting",
    xp: 18
  },
  {
    id: "lantern-maker",
    label: "Lantern maker",
    detail: "Craft one Star Lantern.",
    target: 1,
    skill: "crafting",
    xp: 36
  },
  {
    id: "academy-tour",
    label: "Tour the Academy",
    detail: "Visit each major Academy room: plaza, classrooms, dorms, gardens, observatory, and crafting hall.",
    target: 6,
    skill: "exploration",
    xp: 34
  },
  {
    id: "thaddeus-lesson",
    label: "Hear Thaddeus",
    detail: "Speak with Thaddeus about courage, fear, and the cracks forming inside the Academy.",
    target: 1,
    skill: "exploration",
    xp: 20
  },
  {
    id: "mira-repair",
    label: "Help Mira",
    detail: "Talk with Mira and take the builder's view of saving one practical thing at a time.",
    target: 1,
    skill: "crafting",
    xp: 20
  },
  {
    id: "orin-challenge",
    label: "Answer Orin",
    detail: "Speak with Orin at the Observatory and face his challenge about whether hope is real.",
    target: 1,
    skill: "exploration",
    xp: 20
  },
  {
    id: "academy-social",
    label: "Join activities",
    detail: "Try three Academy social activities across rooms.",
    target: 3,
    skill: "exploration",
    xp: 24
  }
];

export function createStarterSkills(): SkillBook {
  return {
    mining: { xp: 0, level: 1 },
    crafting: { xp: 0, level: 1 },
    exploration: { xp: 0, level: 1 }
  };
}

export function levelForXp(xp: number): number {
  if (xp < 0 || !Number.isFinite(xp)) {
    return 1;
  }
  return Math.max(1, Math.floor(Math.sqrt(xp / 45)) + 1);
}

export function awardSkillXp(skills: SkillBook, skill: SkillId, xp: number): SkillBook {
  const current = skills[skill] ?? { xp: 0, level: 1 };
  const nextXp = Math.max(0, current.xp + Math.max(0, Math.floor(xp)));
  return {
    ...skills,
    [skill]: {
      xp: nextXp,
      level: levelForXp(nextXp)
    }
  };
}

export function createStarterTaskProgress(): TaskProgressBook {
  return Object.fromEntries(TASKS.map((task) => [task.id, 0]));
}

export function createStarterCompletedTasks(): CompletedTaskBook {
  return Object.fromEntries(TASKS.map((task) => [task.id, false]));
}

export function addTaskProgress(
  progress: TaskProgressBook,
  completed: CompletedTaskBook,
  taskId: string,
  amount: number
): { progress: TaskProgressBook; completed: CompletedTaskBook; newlyCompleted: TaskDefinition | null } {
  const task = TASKS.find((candidate) => candidate.id === taskId);
  if (!task || completed[task.id]) {
    return { progress, completed, newlyCompleted: null };
  }

  const nextAmount = Math.min(task.target, (progress[task.id] ?? 0) + Math.max(0, amount));
  const nextProgress = { ...progress, [task.id]: nextAmount };
  const finished = nextAmount >= task.target;
  const nextCompleted = finished ? { ...completed, [task.id]: true } : completed;

  return {
    progress: nextProgress,
    completed: nextCompleted,
    newlyCompleted: finished ? task : null
  };
}
