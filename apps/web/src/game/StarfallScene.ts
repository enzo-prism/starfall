import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";
import {
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ACADEMY_NPCS,
  ACADEMY_ROOMS,
  getBaseTile,
  getTileAt,
  tileKey,
  type ItemId,
  type TileType
} from "@starfall/shared";
import { ensureAvatarTexture, ensureGameTextures, ensureTileTexture } from "./pixel-art";

interface ToolState {
  action: "mine" | "place";
  itemId: ItemId;
}

interface PlayerView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Text;
  emote: Phaser.GameObjects.Text;
  lastAvatarId: string;
}

interface MobileInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export class StarfallScene extends Phaser.Scene {
  private readonly room: Room;
  private tiles = new Map<string, Phaser.GameObjects.Image>();
  private tileState = new Map<string, TileType>();
  private players = new Map<string, PlayerView>();
  private seenChats = new Set<string>();
  private highlight?: Phaser.GameObjects.Rectangle;
  private tool: ToolState = { action: "mine", itemId: "loam_block" };
  private mobileInput: MobileInput = { left: false, right: false, jump: false };
  private inputSequence = 0;
  private stateUnsubscribe: (() => void) | undefined;
  private followedSessionId = "";
  private suppressWorldClickUntil = 0;

  constructor(room: Room) {
    super("StarfallScene");
    this.room = room;
  }

  create(): void {
    ensureGameTextures(this);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    this.cameras.main.setZoom(2);
    this.drawBackground();
    this.createAcademyHub();
    this.createWorldTiles();
    this.createAcademyNpcs();
    this.highlight = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE).setStrokeStyle(2, 0xffe082, 0.9).setDepth(50);
    this.highlight.setVisible(false);

    this.input.mouse?.disableContextMenu();
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updateHighlight(pointer));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer));

    const sync = (state: unknown) => this.syncState(state);
    const maybeUnsubscribe = this.room.onStateChange(sync) as unknown;
    this.stateUnsubscribe = typeof maybeUnsubscribe === "function" ? (maybeUnsubscribe as () => void) : undefined;
    this.syncState(this.room.state);

    window.addEventListener("starfall:tool", this.handleToolEvent);
    window.addEventListener("starfall:mobile-input", this.handleMobileInputEvent);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.time.addEvent({ delay: 45, loop: true, callback: () => this.sendInput() });
  }

  override update(): void {
    const own = this.players.get(this.room.sessionId);
    if (own && this.followedSessionId !== this.room.sessionId) {
      this.cameras.main.startFollow(own.container, false, 0.12, 0.12);
      this.followedSessionId = this.room.sessionId;
    }
  }

  private cleanup(): void {
    this.stateUnsubscribe?.();
    window.removeEventListener("starfall:tool", this.handleToolEvent);
    window.removeEventListener("starfall:mobile-input", this.handleMobileInputEvent);
  }

  private drawBackground(): void {
    this.add.rectangle(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE, 0x111b36).setOrigin(0).setDepth(-40);
    const stars = this.add.graphics().setDepth(-35);
    for (let i = 0; i < 220; i += 1) {
      const x = (i * 137) % (WORLD_WIDTH * TILE_SIZE);
      const y = ((i * 67) % 480) + 28;
      const alpha = 0.35 + ((i * 17) % 50) / 100;
      stars.fillStyle(i % 8 === 0 ? 0xffe082 : 0xd6f4ff, alpha);
      stars.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }

    const far = this.add.graphics().setDepth(-30);
    far.fillStyle(0x263253, 0.85);
    for (let x = -80; x < WORLD_WIDTH * TILE_SIZE + 120; x += 160) {
      far.fillTriangle(x, 760, x + 90, 510 + ((x / 160) % 3) * 28, x + 190, 760);
    }

    const ruins = this.add.graphics().setDepth(-20);
    ruins.fillStyle(0x3d425e, 0.85);
    for (let x = 180; x < WORLD_WIDTH * TILE_SIZE; x += 420) {
      ruins.fillRect(x, 595, 54, 130);
      ruins.fillRect(x - 18, 575, 92, 20);
      ruins.fillStyle(0xffc857, 0.25);
      ruins.fillRect(x + 18, 612, 12, 44);
      ruins.fillStyle(0x3d425e, 0.85);
    }
  }

  private createAcademyHub(): void {
    const graphics = this.add.graphics().setDepth(-12);
    graphics.fillStyle(0x1b2748, 0.92);
    graphics.fillRect(20 * TILE_SIZE, 17 * TILE_SIZE, 75 * TILE_SIZE, 12 * TILE_SIZE);
    graphics.lineStyle(3, 0x6f86b8, 0.85);
    graphics.strokeRect(20 * TILE_SIZE, 17 * TILE_SIZE, 75 * TILE_SIZE, 12 * TILE_SIZE);

    graphics.fillStyle(0x151e38, 0.9);
    graphics.fillRect(53 * TILE_SIZE, 8 * TILE_SIZE, 10 * TILE_SIZE, 9 * TILE_SIZE);
    graphics.lineStyle(3, 0x8aa5dd, 0.75);
    graphics.strokeRect(53 * TILE_SIZE, 8 * TILE_SIZE, 10 * TILE_SIZE, 9 * TILE_SIZE);
    graphics.fillStyle(0xffe082, 0.85);
    graphics.fillCircle(58 * TILE_SIZE, 11 * TILE_SIZE, 18);

    for (const room of ACADEMY_ROOMS) {
      const x = room.tileX * TILE_SIZE;
      const y = room.tileY * TILE_SIZE;
      const width = room.widthTiles * TILE_SIZE;
      const height = room.heightTiles * TILE_SIZE;
      const roomColor = room.id === "gardens" ? 0x244d45 : room.id === "crafting-hall" ? 0x54394b : 0x223052;
      graphics.fillStyle(roomColor, 0.72);
      graphics.fillRect(x, y, width, height);
      graphics.lineStyle(2, room.id === "plaza" ? 0xffd66b : 0x6079aa, 0.85);
      graphics.strokeRect(x, y, width, height);

      for (let column = 1; column < room.widthTiles; column += 3) {
        graphics.fillStyle(0xffd66b, 0.35);
        graphics.fillRect(x + column * TILE_SIZE + 6, y + 18, 12, 24);
      }

      const label = this.add
        .text(x + width / 2, y + 9, room.shortLabel, {
          fontFamily: '"Trebuchet MS", Arial, sans-serif',
          fontSize: "8px",
          color: "#ffe082",
          stroke: "#11182b",
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(8);

      const zone = this.add
        .zone(x, y, width, height)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(30);
      zone.on("pointerdown", () => {
        this.suppressWorldClickUntil = Date.now() + 160;
        window.dispatchEvent(new CustomEvent("starfall:room-selected", { detail: { roomId: room.id } }));
      });
      label.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        this.suppressWorldClickUntil = Date.now() + 160;
        window.dispatchEvent(new CustomEvent("starfall:room-selected", { detail: { roomId: room.id } }));
      });
    }
  }

  private createAcademyNpcs(): void {
    for (const npc of ACADEMY_NPCS) {
      const isThaddeus = npc.id === "thaddeus";
      const spriteConfig = isThaddeus
        ? { width: 30, height: 44, spriteY: -22, nameY: -61, hintY: -50, zoneWidth: 42, zoneHeight: 74 }
        : { width: 20, height: 32, spriteY: -16, nameY: -45, hintY: -34, zoneWidth: 34, zoneHeight: 56 };
      const container = this.add.container(npc.tileX * TILE_SIZE, npc.tileY * TILE_SIZE - 6).setDepth(28);
      const texture = `npc-${npc.id}`;
      if (!this.textures.exists(texture)) {
        const body = this.add.graphics();
        if (isThaddeus) {
          drawThaddeusSprite(body);
        } else {
          drawDefaultNpcSprite(body, Phaser.Display.Color.HexStringToColor(npc.color).color);
        }
        body.generateTexture(texture, spriteConfig.width, spriteConfig.height);
        body.destroy();
      }
      const sprite = this.add.image(0, spriteConfig.spriteY, `npc-${npc.id}`).setOrigin(0.5).setDepth(28);
      const name = this.add
        .text(0, spriteConfig.nameY, npc.name, {
          fontFamily: '"Trebuchet MS", Arial, sans-serif',
          fontSize: "8px",
          color: "#fff4a3",
          stroke: "#11182b",
          strokeThickness: 3
        })
        .setOrigin(0.5)
        .setDepth(29);
      const hint = this.add
        .text(0, spriteConfig.hintY, "Talk", {
          fontFamily: '"Trebuchet MS", Arial, sans-serif',
          fontSize: "7px",
          color: "#d6f4ff",
          stroke: "#11182b",
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(29);
      container.add([sprite, name, hint]);
      container.setSize(spriteConfig.zoneWidth, spriteConfig.zoneHeight);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", () => {
        this.suppressWorldClickUntil = Date.now() + 160;
        window.dispatchEvent(new CustomEvent("starfall:npc-selected", { detail: { npcId: npc.id } }));
      });
    }
  }

  private createWorldTiles(): void {
    for (let y = 0; y < WORLD_HEIGHT; y += 1) {
      for (let x = 0; x < WORLD_WIDTH; x += 1) {
        const tile = getBaseTile(x, y);
        this.tileState.set(tileKey(x, y), tile);
        this.setTileImage(x, y, tile);
      }
    }
  }

  private syncState(rawState: any): void {
    if (!rawState) {
      return;
    }

    rawState.tileChanges?.forEach?.((change: any, key: string) => {
      const tile = change.tile as TileType;
      if (this.tileState.get(key) !== tile) {
        this.tileState.set(key, tile);
        this.setTileImage(change.x, change.y, tile);
      }
    });

    const activeSessions = new Set<string>();
    rawState.players?.forEach?.((player: any, sessionId: string) => {
      activeSessions.add(sessionId);
      this.syncPlayer(sessionId, player);
    });

    for (const [sessionId, view] of this.players) {
      if (!activeSessions.has(sessionId)) {
        view.container.destroy(true);
        this.players.delete(sessionId);
      }
    }

    rawState.chatEvents?.forEach?.((event: any) => {
      if (!event?.id || this.seenChats.has(event.id)) {
        return;
      }
      this.seenChats.add(event.id);
      const view = this.players.get(event.sessionId);
      if (view) {
        view.bubble.setText(event.text);
        view.bubble.setVisible(true);
        this.time.delayedCall(3200, () => view.bubble.setVisible(false));
      }
    });
  }

  private syncPlayer(sessionId: string, player: any): void {
    const avatarId = String(player.avatarId || "nova");
    let view = this.players.get(sessionId);
    if (!view) {
      const texture = ensureAvatarTexture(this, avatarId);
      const sprite = this.add.image(0, 0, texture).setOrigin(0.5, 0.5).setDepth(20);
      const name = this.add
        .text(0, -26, player.displayName || "Guest", {
          fontFamily: '"Trebuchet MS", Arial, sans-serif',
          fontSize: "9px",
          color: sessionId === this.room.sessionId ? "#fff4a3" : "#e7f6ff",
          stroke: "#11182b",
          strokeThickness: 3
        })
        .setOrigin(0.5)
        .setDepth(22);
      const bubble = this.add
        .text(0, -48, "", {
          fontFamily: '"Trebuchet MS", Arial, sans-serif',
          fontSize: "8px",
          color: "#172033",
          backgroundColor: "#f8f1d3",
          padding: { left: 4, right: 4, top: 2, bottom: 2 },
          wordWrap: { width: 110 }
        })
        .setOrigin(0.5)
        .setDepth(23)
        .setVisible(false);
      const emote = this.add
        .text(14, -20, "", {
          fontFamily: '"Trebuchet MS", Arial, sans-serif',
          fontSize: "14px",
          color: "#ffdf70",
          stroke: "#11182b",
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(24);
      const container = this.add.container(player.x, player.y, [sprite, name, bubble, emote]).setDepth(20);
      view = { container, sprite, name, bubble, emote, lastAvatarId: avatarId };
      this.players.set(sessionId, view);
    }

    if (view.lastAvatarId !== avatarId) {
      view.sprite.setTexture(ensureAvatarTexture(this, avatarId));
      view.lastAvatarId = avatarId;
    }

    view.container.setPosition(player.x, player.y);
    view.sprite.setFlipX(player.facing === "left");
    view.name.setText(player.displayName || "Guest");
    view.emote.setText(emoteGlyph(player.emote));
  }

  private setTileImage(x: number, y: number, tile: TileType): void {
    const key = tileKey(x, y);
    const existing = this.tiles.get(key);
    if (existing) {
      existing.destroy();
      this.tiles.delete(key);
    }
    if (tile === "air") {
      return;
    }
    const texture = ensureTileTexture(this, tile);
    const image = this.add
      .image(x * TILE_SIZE, y * TILE_SIZE, texture)
      .setOrigin(0)
      .setDepth(tile === "plaza_lamp" ? 12 : 5);
    this.tiles.set(key, image);
  }

  private updateHighlight(pointer: Phaser.Input.Pointer): void {
    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);
    if (tileX < 0 || tileX >= WORLD_WIDTH || tileY < 0 || tileY >= WORLD_HEIGHT) {
      this.highlight?.setVisible(false);
      return;
    }
    this.highlight?.setVisible(true);
    this.highlight?.setPosition(tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE + TILE_SIZE / 2);
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.rightButtonDown()) {
      return;
    }
    if (Date.now() < this.suppressWorldClickUntil) {
      return;
    }
    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const x = Math.floor(worldPoint.x / TILE_SIZE);
    const y = Math.floor(worldPoint.y / TILE_SIZE);
    if (this.tool.action === "mine") {
      this.room.send("mineTile", { x, y });
    } else {
      this.room.send("placeTile", { x, y, itemId: this.tool.itemId });
    }
  }

  private sendInput(): void {
    const keyboard = this.input.keyboard;
    const left =
      this.mobileInput.left ||
      keyboard?.addKey("A").isDown ||
      keyboard?.addKey("LEFT").isDown ||
      false;
    const right =
      this.mobileInput.right ||
      keyboard?.addKey("D").isDown ||
      keyboard?.addKey("RIGHT").isDown ||
      false;
    const jump =
      this.mobileInput.jump ||
      keyboard?.addKey("W").isDown ||
      keyboard?.addKey("UP").isDown ||
      keyboard?.addKey("SPACE").isDown ||
      false;

    this.room.send("input", {
      left,
      right,
      jump,
      sequence: this.inputSequence++
    });
  }

  private handleToolEvent = (event: Event): void => {
    const detail = (event as CustomEvent<ToolState>).detail;
    if (detail?.action && detail?.itemId) {
      this.tool = detail;
    }
  };

  private handleMobileInputEvent = (event: Event): void => {
    const detail = (event as CustomEvent<MobileInput>).detail;
    this.mobileInput = {
      left: detail?.left === true,
      right: detail?.right === true,
      jump: detail?.jump === true
    };
  };
}

function drawDefaultNpcSprite(graphics: Phaser.GameObjects.Graphics, bodyColor: number): void {
  graphics.fillStyle(bodyColor, 1);
  graphics.fillRect(4, 11, 12, 17);
  graphics.fillStyle(0xffe8b6, 1);
  graphics.fillRect(5, 4, 10, 8);
  graphics.fillStyle(0x11182b, 1);
  graphics.fillRect(7, 7, 2, 2);
  graphics.fillRect(12, 7, 2, 2);
  graphics.fillStyle(0xffd66b, 1);
  graphics.fillRect(3, 27, 14, 4);
}

function drawThaddeusSprite(graphics: Phaser.GameObjects.Graphics): void {
  const outline = 0x11182b;
  const skin = 0xb99078;
  const skinShade = 0x8e6a58;
  const robe = 0xb9bd91;
  const robeShade = 0x737d55;
  const gold = 0xb9aa50;
  const goldLight = 0xd8cb6a;
  const hair = 0x9c9aa4;
  const hairShade = 0x696a75;
  const eye = 0xf0e7c9;
  const iris = 0x5f6f4b;

  graphics.fillStyle(outline, 1);
  graphics.fillRect(5, 20, 20, 21);
  graphics.fillRect(3, 23, 5, 15);
  graphics.fillRect(22, 22, 5, 16);
  graphics.fillRect(7, 15, 16, 21);
  graphics.fillRect(8, 5, 14, 17);
  graphics.fillRect(5, 9, 5, 9);
  graphics.fillRect(20, 9, 5, 12);
  graphics.fillRect(9, 34, 12, 8);

  graphics.fillStyle(robeShade, 1);
  graphics.fillRect(5, 21, 20, 20);
  graphics.fillRect(4, 24, 5, 14);
  graphics.fillRect(22, 23, 4, 15);
  graphics.fillStyle(robe, 1);
  graphics.fillRect(8, 20, 15, 20);
  graphics.fillRect(5, 24, 4, 13);
  graphics.fillRect(22, 24, 3, 13);
  graphics.fillRect(7, 17, 17, 8);

  graphics.fillStyle(gold, 1);
  graphics.fillTriangle(5, 19, 13, 39, 11, 20);
  graphics.fillTriangle(25, 19, 16, 39, 19, 20);
  graphics.fillRect(10, 33, 10, 5);
  graphics.fillStyle(goldLight, 1);
  graphics.fillRect(8, 20, 3, 7);
  graphics.fillRect(19, 20, 3, 7);
  graphics.fillRect(13, 34, 5, 5);
  graphics.fillStyle(outline, 1);
  graphics.fillRect(13, 33, 5, 1);
  graphics.fillRect(12, 35, 1, 3);
  graphics.fillRect(18, 35, 1, 3);

  graphics.fillStyle(hairShade, 1);
  graphics.fillRect(6, 8, 4, 10);
  graphics.fillRect(21, 8, 4, 13);
  graphics.fillRect(23, 18, 3, 8);
  graphics.fillStyle(hair, 1);
  graphics.fillRect(6, 9, 3, 8);
  graphics.fillRect(21, 9, 3, 10);
  graphics.fillRect(24, 19, 2, 6);

  graphics.fillStyle(skin, 1);
  graphics.fillRect(10, 3, 10, 4);
  graphics.fillRect(9, 6, 13, 12);
  graphics.fillRect(8, 11, 2, 5);
  graphics.fillRect(22, 11, 2, 5);
  graphics.fillRect(11, 17, 10, 5);
  graphics.fillStyle(skinShade, 1);
  graphics.fillRect(21, 12, 2, 5);
  graphics.fillRect(15, 12, 2, 6);
  graphics.fillRect(10, 17, 3, 2);

  graphics.fillStyle(hairShade, 1);
  graphics.fillRect(8, 17, 4, 5);
  graphics.fillRect(19, 17, 4, 5);
  graphics.fillRect(9, 21, 13, 15);
  graphics.fillRect(11, 36, 10, 4);
  graphics.fillStyle(hair, 1);
  graphics.fillRect(9, 16, 3, 5);
  graphics.fillRect(19, 16, 3, 5);
  graphics.fillRect(10, 21, 11, 14);
  graphics.fillRect(12, 35, 8, 4);
  graphics.fillRect(8, 23, 3, 8);
  graphics.fillRect(20, 23, 3, 8);

  graphics.fillStyle(outline, 1);
  graphics.fillRect(9, 10, 5, 1);
  graphics.fillRect(17, 10, 5, 1);
  graphics.fillStyle(hair, 1);
  graphics.fillRect(9, 9, 5, 1);
  graphics.fillRect(17, 9, 5, 1);
  graphics.fillStyle(eye, 1);
  graphics.fillRect(10, 12, 4, 2);
  graphics.fillRect(18, 12, 4, 2);
  graphics.fillStyle(iris, 1);
  graphics.fillRect(12, 12, 1, 2);
  graphics.fillRect(19, 12, 1, 2);
  graphics.fillStyle(outline, 1);
  graphics.fillRect(11, 14, 2, 1);
  graphics.fillRect(18, 14, 2, 1);
  graphics.fillRect(13, 18, 5, 1);

  graphics.fillStyle(hairShade, 1);
  graphics.fillRect(13, 25, 1, 4);
  graphics.fillRect(17, 25, 1, 4);
  graphics.fillRect(12, 35, 2, 1);
  graphics.fillRect(17, 35, 2, 1);

  graphics.fillStyle(gold, 1);
  graphics.fillRect(7, 23, 3, 12);
  graphics.fillRect(21, 23, 3, 12);
  graphics.fillRect(12, 36, 7, 1);
  graphics.fillRect(13, 37, 5, 4);
  graphics.fillStyle(goldLight, 1);
  graphics.fillRect(8, 23, 2, 5);
  graphics.fillRect(21, 23, 2, 5);
  graphics.fillRect(14, 37, 3, 3);
  graphics.fillStyle(outline, 1);
  graphics.fillRect(12, 36, 7, 1);
  graphics.fillRect(13, 40, 5, 1);
}

function emoteGlyph(value: string): string {
  if (value === "wave") {
    return "o/";
  }
  if (value === "sparkle") {
    return "*";
  }
  if (value === "cheer") {
    return "!!";
  }
  if (value === "sit") {
    return "_";
  }
  return "";
}
