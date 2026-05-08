import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";
import { WORLD_HEIGHT, WORLD_WIDTH, TILE_SIZE } from "@starfall/shared";
import { StarfallScene } from "./game/StarfallScene";

interface GameCanvasProps {
  room: Room;
}

export function GameCanvas({ room }: GameCanvasProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!parentRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: parentRef.current,
      width: 1280,
      height: 720,
      backgroundColor: "#111b36",
      pixelArt: true,
      roundPixels: true,
      scene: [new StarfallScene(room)],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: "arcade"
      }
    });
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [room]);

  return (
    <div
      ref={parentRef}
      className="game-canvas"
      data-world={`${WORLD_WIDTH}x${WORLD_HEIGHT}`}
      data-tile-size={TILE_SIZE}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
