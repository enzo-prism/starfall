import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@colyseus/sdk";
import { createStarfallServer, type StarfallServer } from "../src/index";

let server: StarfallServer | null = null;

afterEach(async () => {
  if (server) {
    await server.close();
    server = null;
  }
});

describe("Starfall multiplayer server", () => {
  it("lets two clients join, chat, and see the same room state", async () => {
    server = createStarfallServer({
      dbPath: join(mkdtempSync(join(tmpdir(), "starfall-test-")), "starfall.sqlite")
    });
    const port = await server.listen(0);
    const clientA = new Client(`http://localhost:${port}`);
    const clientB = new Client(`http://localhost:${port}`);

    const roomA = await clientA.joinOrCreate("world", {
      guestId: "guest-a",
      displayName: "Nova A",
      avatarId: "nova"
    });
    const roomB = await clientB.joinOrCreate("world", {
      guestId: "guest-b",
      displayName: "Nova B",
      avatarId: "ember"
    });

    await waitFor(() => roomA.state.players.size === 2 && roomB.state.players.size === 2);
    roomA.send("chat", { text: "Hello, Starfall!" });
    await waitFor(() => roomB.state.chatEvents.some((event: any) => event.text === "Hello, Starfall!"));

    expect(roomA.state.players.size).toBe(2);
    expect(roomB.state.players.size).toBe(2);

    await roomA.leave();
    await roomB.leave();
  });

  it("rejects out-of-range mining instead of changing the world", async () => {
    server = createStarfallServer({
      dbPath: join(mkdtempSync(join(tmpdir(), "starfall-test-")), "starfall.sqlite")
    });
    const port = await server.listen(0);
    const client = new Client(`http://localhost:${port}`);
    const room = await client.joinOrCreate("world", {
      guestId: "guest-range",
      displayName: "Range Test",
      avatarId: "moss"
    });

    room.send("mineTile", { x: 2, y: 50 });
    await new Promise((resolve) => setTimeout(resolve, 140));
    expect(room.state.tileChanges.has("2,50")).toBe(false);
    await room.leave();
  });

  it("syncs Academy room visits, NPC talks, and social activities", async () => {
    server = createStarfallServer({
      dbPath: join(mkdtempSync(join(tmpdir(), "starfall-test-")), "starfall.sqlite")
    });
    const port = await server.listen(0);
    const client = new Client(`http://localhost:${port}`);
    const room = await client.joinOrCreate("world", {
      guestId: "guest-academy",
      displayName: "Academy Test",
      avatarId: "nova"
    });

    room.send("visitRoom", { roomId: "plaza" });
    room.send("talkNpc", { npcId: "thaddeus" });
    room.send("socialActivity", { activityId: "plaza-greeting" });

    await waitFor(() => {
      const player = room.state?.players?.get?.(room.sessionId);
      return (
        player?.taskProgress?.get?.("academy-tour") === 1 &&
        player?.taskProgress?.get?.("thaddeus-lesson") === 1 &&
        player?.taskProgress?.get?.("academy-social") === 1
      );
    });
    expect(room.state.chatEvents.some((event: any) => event.displayName === "Thaddeus")).toBe(true);
    expect(room.state.chatEvents.some((event: any) => event.text.includes("welcome circle"))).toBe(true);

    await room.leave();
  });
});

async function waitFor(assertion: () => boolean, timeoutMs = 2000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (assertion()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for condition");
}
