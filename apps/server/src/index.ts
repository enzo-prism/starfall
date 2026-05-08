import type { Server as HttpServer } from "node:http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";
import express from "express";
import { WORLD_ID, generateWorldSnapshot } from "@starfall/shared";
import { StarfallDatabase } from "./db";
import { WorldRoom } from "./room";

export interface StarfallServer {
  app: express.Application;
  httpServer: HttpServer;
  gameServer: Server;
  db: StarfallDatabase;
  listen: (port?: number) => Promise<number>;
  close: () => Promise<void>;
}

export function createStarfallServer(options: { dbPath?: string } = {}): StarfallServer {
  const db = new StarfallDatabase(options.dbPath);
  const transport = new WebSocketTransport();
  const app = transport.getExpressApp();
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      service: "starfall-server",
      world: WORLD_ID,
      checkedAt: new Date().toISOString()
    });
  });

  app.get("/world/:id/snapshot", (request, response) => {
    const snapshot = db.snapshot(request.params.id || WORLD_ID);
    response.json({
      ...snapshot,
      generated: generateWorldSnapshot(snapshot.tileChanges)
    });
  });

  const gameServer = new Server({
    transport,
    greet: false
  });
  gameServer.define("world", WorldRoom, options.dbPath ? { dbPath: options.dbPath } : {});
  const httpServer = transport.server as HttpServer;

  return {
    app,
    httpServer,
    gameServer,
    db,
    listen: (port = Number(process.env.PORT ?? 2567)) =>
      new Promise((resolveListen, reject) => {
        gameServer
          .listen(port)
          .then(() => {
            const address = httpServer.address();
            resolveListen(typeof address === "object" && address ? address.port : port);
          })
          .catch((error) => reject(error));
      }),
    close: async () => {
      try {
        await gameServer.gracefullyShutdown(false);
      } finally {
        db.close();
      }
    }
  };
}

if (process.env.NODE_ENV !== "test") {
  const server = createStarfallServer();
  const port = await server.listen();
  console.log(`Starfall server listening on http://localhost:${port}`);
}
