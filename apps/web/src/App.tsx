import { useEffect, useMemo, useState } from "react";
import { Client, type Room } from "@colyseus/sdk";
import {
  ACADEMY_NPCS,
  ACADEMY_ROOMS,
  ITEM_DEFINITIONS,
  RECIPES,
  SOCIAL_ACTIVITIES,
  TASKS,
  WORLD_NAME,
  getAcademyNpc,
  getAcademyRoom,
  getSocialActivity,
  getQuickChatOptions,
  sanitizeDisplayName,
  type ItemId
} from "@starfall/shared";
import { GameCanvas } from "./GameCanvas";
import { avatarOptions } from "./game/avatar-options";

const SERVER_URL = import.meta.env.VITE_STARFALL_SERVER_URL ?? "http://localhost:2567";

type ToolAction = "mine" | "place";

interface PlayerSnapshot {
  sessionId: string;
  displayName: string;
  avatarId: string;
}

interface ChatSnapshot {
  id: string;
  sessionId: string;
  displayName: string;
  text: string;
  sentAt: number;
}

interface RoomSnapshot {
  players: PlayerSnapshot[];
  inventory: Record<string, number>;
  skillsXp: Record<string, number>;
  skillsLevel: Record<string, number>;
  taskProgress: Record<string, number>;
  completedTasks: Record<string, boolean>;
  chatEvents: ChatSnapshot[];
}

const emptySnapshot: RoomSnapshot = {
  players: [],
  inventory: {},
  skillsXp: {},
  skillsLevel: {},
  taskProgress: {},
  completedTasks: {},
  chatEvents: []
};

export function App() {
  const [guestId] = useState(() => getOrCreateGuestId());
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("starfall.displayName") ?? "");
  const [avatarId, setAvatarId] = useState(() => localStorage.getItem("starfall.avatarId") ?? "nova");
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState(`Choose a name to enter ${WORLD_NAME}.`);
  const [joining, setJoining] = useState(false);
  const [snapshot, setSnapshot] = useState<RoomSnapshot>(emptySnapshot);
  const [toolAction, setToolAction] = useState<ToolAction>("mine");
  const [selectedItem, setSelectedItem] = useState<ItemId>("loam_block");
  const [chatDraft, setChatDraft] = useState("");
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [mobileInput, setMobileInput] = useState({ left: false, right: false, jump: false });
  const [selectedNpcId, setSelectedNpcId] = useState("thaddeus");
  const [selectedRoomId, setSelectedRoomId] = useState("plaza");

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("starfall:tool", {
        detail: { action: toolAction, itemId: selectedItem }
      })
    );
  }, [toolAction, selectedItem]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("starfall:mobile-input", { detail: mobileInput }));
  }, [mobileInput]);

  useEffect(() => {
    if (!room) {
      return;
    }
    const sync = (state: unknown) => setSnapshot(readSnapshot(room, state));
    const maybeUnsubscribe = room.onStateChange(sync) as unknown;
    sync(room.state);
    room.onLeave((code) => setStatus(`Disconnected from ${WORLD_NAME} (${code}).`));
    return () => {
      if (typeof maybeUnsubscribe === "function") {
        maybeUnsubscribe();
      }
    };
  }, [room]);

  useEffect(() => {
    const selectNpc = (event: Event) => {
      const npcId = (event as CustomEvent<{ npcId: string }>).detail?.npcId;
      if (npcId) {
        setSelectedNpcId(npcId);
      }
    };
    const selectRoom = (event: Event) => {
      const roomId = (event as CustomEvent<{ roomId: string }>).detail?.roomId;
      if (roomId) {
        setSelectedRoomId(roomId);
        room?.send("visitRoom", { roomId });
      }
    };

    window.addEventListener("starfall:npc-selected", selectNpc);
    window.addEventListener("starfall:room-selected", selectRoom);
    return () => {
      window.removeEventListener("starfall:npc-selected", selectNpc);
      window.removeEventListener("starfall:room-selected", selectRoom);
    };
  }, [room]);

  const ownPlayer = snapshot.players.find((player) => player.sessionId === room?.sessionId);
  const visibleChats = snapshot.chatEvents.filter((event) => !muted.has(event.sessionId));
  const inventoryItems = Object.entries(snapshot.inventory).filter(([, count]) => count > 0);
  const selectedNpc = getAcademyNpc(selectedNpcId) ?? ACADEMY_NPCS[0]!;
  const selectedRoom = getAcademyRoom(selectedRoomId) ?? ACADEMY_ROOMS[0]!;
  const selectedActivity = selectedRoom ? getSocialActivity(selectedRoom.activityId) : undefined;
  const selectedRoomNpcs = selectedRoom.hostNpcIds
    .map((npcId) => getAcademyNpc(npcId))
    .filter((npc) => npc !== undefined);
  const canCraft = useMemo(() => {
    return Object.fromEntries(
      Object.entries(RECIPES).map(([itemId, recipe]) => [
        itemId,
        Object.entries(recipe.inputs).every(([input, count]) => (snapshot.inventory[input] ?? 0) >= (count ?? 0))
      ])
    ) as Record<string, boolean>;
  }, [snapshot.inventory]);

  async function joinWorld() {
    setJoining(true);
    setStatus(`Opening a path to ${WORLD_NAME}...`);
    try {
      const safeName = sanitizeDisplayName(displayName);
      localStorage.setItem("starfall.displayName", safeName);
      localStorage.setItem("starfall.avatarId", avatarId);
      const client = new Client(SERVER_URL);
      const nextRoom = await client.joinOrCreate("world", {
        guestId,
        displayName: safeName,
        avatarId
      });
      setRoom(nextRoom);
      setStatus(`Connected to ${WORLD_NAME}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not connect to the Starfall server.");
    } finally {
      setJoining(false);
    }
  }

  function sendChat(text = chatDraft) {
    if (!room || !text.trim()) {
      return;
    }
    room.send("chat", { text });
    setChatDraft("");
  }

  function sendEmote(emoteId: string) {
    room?.send("emote", { emoteId });
  }

  function craft(itemId: string) {
    room?.send("craftItem", { itemId });
  }

  function visitRoom(roomId: string) {
    setSelectedRoomId(roomId);
    room?.send("visitRoom", { roomId });
    const academyRoom = getAcademyRoom(roomId);
    if (academyRoom) {
      setStatus(`Visited ${academyRoom.label}.`);
    }
  }

  function talkNpc(npcId: string) {
    setSelectedNpcId(npcId);
    room?.send("talkNpc", { npcId });
    const npc = getAcademyNpc(npcId);
    if (npc) {
      setStatus(`${npc.name} shared a truth.`);
    }
  }

  function startActivity(activityId: string) {
    room?.send("socialActivity", { activityId });
    const activity = getSocialActivity(activityId);
    if (activity) {
      setStatus(`${activity.label} started.`);
    }
  }

  function toggleMute(sessionId: string) {
    setMuted((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  if (!room) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div className="brand-mark">STARFALL</div>
          <h1>Enter Starfall Academy</h1>
          <p>
            A cozy pixel Academy where guests restore rooms, meet classmates, craft repairs, and decide what hope
            means under a falling sky.
          </p>
          <label>
            Display name
            <input
              value={displayName}
              maxLength={18}
              placeholder="Nova Builder"
              onChange={(event) => setDisplayName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void joinWorld();
                }
              }}
            />
          </label>
          <div className="avatar-picker" aria-label="Avatar">
            {avatarOptions().map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                className={avatarId === avatar.id ? "selected" : ""}
                onClick={() => setAvatarId(avatar.id)}
              >
                {avatar.label}
              </button>
            ))}
          </div>
          <button type="button" className="primary-action" disabled={joining} onClick={() => void joinWorld()}>
            {joining ? "Joining..." : "Play Starfall"}
          </button>
          <div className="status-line">{status}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <GameCanvas room={room} />

      <header className="top-hud">
        <div>
          <strong>Starfall</strong>
          <span>{WORLD_NAME}</span>
        </div>
        <div className="status-pill">{status}</div>
      </header>

      <aside className="left-hud">
        <section className="hud-panel player-panel">
          <div className="panel-title">{ownPlayer?.displayName ?? "Traveler"}</div>
          <div className="skill-grid">
            {(["mining", "crafting", "exploration"] as const).map((skill) => (
              <div key={skill}>
                <span>{skill}</span>
                <strong>Lv {snapshot.skillsLevel[skill] ?? 1}</strong>
                <small>{snapshot.skillsXp[skill] ?? 0} xp</small>
              </div>
            ))}
          </div>
        </section>

        <section className="hud-panel">
          <div className="panel-title">Path</div>
          <div className="task-list">
            {TASKS.map((task) => {
              const progress = Math.min(task.target, snapshot.taskProgress[task.id] ?? 0);
              const done = snapshot.completedTasks[task.id] === true;
              return (
                <div key={task.id} className={done ? "task done" : "task"}>
                  <span>{task.label}</span>
                  <small>
                    {Math.floor(progress)} / {task.target}
                  </small>
                </div>
              );
            })}
          </div>
        </section>
      </aside>

      <aside className="right-hud">
        <section className="hud-panel">
          <div className="panel-title">Online</div>
          <div className="player-list">
            {snapshot.players.map((player) => (
              <button key={player.sessionId} type="button" onClick={() => toggleMute(player.sessionId)}>
                <span>{player.displayName}</span>
                <small>{muted.has(player.sessionId) ? "muted" : player.avatarId}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="hud-panel academy-panel">
          <div className="panel-title">Academy</div>
          <div className="room-grid">
            {ACADEMY_ROOMS.map((academyRoom) => (
              <button
                key={academyRoom.id}
                type="button"
                className={selectedRoom?.id === academyRoom.id ? "selected" : ""}
                onClick={() => visitRoom(academyRoom.id)}
              >
                {academyRoom.shortLabel}
              </button>
            ))}
          </div>
          {selectedRoom && (
            <div className="academy-card">
              <strong>{selectedRoom.label}</strong>
              <span>{selectedRoom.description}</span>
              <small>Hosts: {selectedRoomNpcs.map((npc) => npc.name).join(", ")}</small>
              {selectedActivity && (
                <button type="button" onClick={() => startActivity(selectedActivity.id)}>
                  {selectedActivity.label}
                </button>
              )}
            </div>
          )}
          <div className="npc-list">
            {ACADEMY_NPCS.map((npc) => (
              <button
                key={npc.id}
                type="button"
                className={selectedNpc?.id === npc.id ? "selected" : ""}
                onClick={() => setSelectedNpcId(npc.id)}
              >
                <span>{npc.name}</span>
                <small>{npc.role}</small>
              </button>
            ))}
          </div>
          {selectedNpc && (
            <div className="npc-card">
              <strong>{selectedNpc.name}</strong>
              <span>{selectedNpc.dialogue[0] ?? selectedNpc.greeting}</span>
              <small>{selectedNpc.truth}</small>
              <button type="button" onClick={() => talkNpc(selectedNpc.id)}>
                Talk
              </button>
            </div>
          )}
        </section>

        <section className="hud-panel">
          <div className="panel-title">Craft</div>
          <div className="craft-list">
            {Object.entries(RECIPES).map(([itemId, recipe]) => (
              <button key={itemId} type="button" disabled={!canCraft[itemId]} onClick={() => craft(itemId)}>
                <span>{recipe.label}</span>
                <small>
                  {Object.entries(recipe.inputs)
                    .map(([input, count]) => `${ITEM_DEFINITIONS[input]?.label ?? input} x${count}`)
                    .join(" + ")}
                </small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="chat-panel hud-panel">
        <div className="chat-log" aria-live="polite">
          {visibleChats.slice(-7).map((event) => (
            <div key={event.id}>
              <strong>{event.displayName}</strong>
              <span>{event.text}</span>
            </div>
          ))}
        </div>
        <form
          className="chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            sendChat();
          }}
        >
          <input value={chatDraft} maxLength={96} onChange={(event) => setChatDraft(event.target.value)} />
          <button type="submit">Send</button>
        </form>
        <div className="quick-chat">
          {getQuickChatOptions().slice(0, 4).map((text) => (
            <button key={text} type="button" onClick={() => sendChat(text)}>
              {text}
            </button>
          ))}
        </div>
      </section>

      <nav className="bottom-hud" aria-label="Tools and inventory">
        <div className="tool-toggle">
          <button className={toolAction === "mine" ? "selected" : ""} type="button" onClick={() => setToolAction("mine")}>
            Pick
          </button>
          <button className={toolAction === "place" ? "selected" : ""} type="button" onClick={() => setToolAction("place")}>
            Place
          </button>
        </div>
        <div className="inventory-bar">
          {inventoryItems.map(([itemId, count]) => (
            <button
              key={itemId}
              type="button"
              className={selectedItem === itemId ? "selected" : ""}
              onClick={() => {
                setSelectedItem(itemId as ItemId);
                if (ITEM_DEFINITIONS[itemId]?.placeTile) {
                  setToolAction("place");
                }
              }}
            >
              <span>{ITEM_DEFINITIONS[itemId]?.label ?? itemId}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
        <div className="emotes">
          {["wave", "sparkle", "cheer", "sit"].map((emote) => (
            <button key={emote} type="button" onClick={() => sendEmote(emote)}>
              {emote}
            </button>
          ))}
        </div>
      </nav>

      <div className="mobile-controls" aria-label="Mobile controls">
        <button
          type="button"
          onPointerDown={() => setMobileInput((current) => ({ ...current, left: true }))}
          onPointerUp={() => setMobileInput((current) => ({ ...current, left: false }))}
          onPointerCancel={() => setMobileInput((current) => ({ ...current, left: false }))}
        >
          Left
        </button>
        <button
          type="button"
          onPointerDown={() => setMobileInput((current) => ({ ...current, right: true }))}
          onPointerUp={() => setMobileInput((current) => ({ ...current, right: false }))}
          onPointerCancel={() => setMobileInput((current) => ({ ...current, right: false }))}
        >
          Right
        </button>
        <button
          type="button"
          onPointerDown={() => setMobileInput((current) => ({ ...current, jump: true }))}
          onPointerUp={() => setMobileInput((current) => ({ ...current, jump: false }))}
          onPointerCancel={() => setMobileInput((current) => ({ ...current, jump: false }))}
        >
          Jump
        </button>
      </div>
    </main>
  );
}

function readSnapshot(room: Room, rawState: any): RoomSnapshot {
  if (!rawState) {
    return emptySnapshot;
  }
  const self = rawState.players?.get?.(room.sessionId);
  const players: PlayerSnapshot[] = [];
  rawState.players?.forEach?.((player: any, sessionId: string) => {
    players.push({
      sessionId,
      displayName: String(player.displayName ?? "Guest"),
      avatarId: String(player.avatarId ?? "nova")
    });
  });

  return {
    players,
    inventory: readNumberMap(self?.inventory),
    skillsXp: readNumberMap(self?.skillsXp),
    skillsLevel: readNumberMap(self?.skillsLevel),
    taskProgress: readNumberMap(self?.taskProgress),
    completedTasks: readBooleanMap(self?.completedTasks),
    chatEvents:
      rawState.chatEvents?.map?.((event: any) => ({
        id: String(event.id),
        sessionId: String(event.sessionId),
        displayName: String(event.displayName),
        text: String(event.text),
        sentAt: Number(event.sentAt)
      })) ?? []
  };
}

function readNumberMap(map: any): Record<string, number> {
  const output: Record<string, number> = {};
  map?.forEach?.((value: number, key: string) => {
    output[key] = Number(value) || 0;
  });
  return output;
}

function readBooleanMap(map: any): Record<string, boolean> {
  const output: Record<string, boolean> = {};
  map?.forEach?.((value: boolean, key: string) => {
    output[key] = value === true;
  });
  return output;
}

function getOrCreateGuestId(): string {
  const existing = localStorage.getItem("starfall.guestId");
  if (existing) {
    return existing;
  }
  const next = crypto.randomUUID();
  localStorage.setItem("starfall.guestId", next);
  return next;
}
