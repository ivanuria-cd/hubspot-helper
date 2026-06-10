import express, { type Express, type Request, type Response } from 'express';
import type { Server as HttpServer } from 'node:http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

const SSE_PATH = '/sse';
const MESSAGES_PATH = '/messages';

export interface HttpSseDeps {
  /** Crea un servidor MCP nuevo por cada conexión SSE entrante. */
  serverFactory: () => Server;
  validateToken: (token: string | undefined) => boolean;
  log?: (message: string) => void;
}

export interface HttpSseHandle {
  port: number;
  close: () => Promise<void>;
}

function extractToken(req: Request): string | undefined {
  const apiKey = req.header('x-api-key');
  if (apiKey) return apiKey.trim();
  const auth = req.header('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return undefined;
}

/** Construye la app Express con autenticación y rutas SSE/POST. */
export function createHttpSseApp(deps: HttpSseDeps): Express {
  const app = express();
  const transports = new Map<string, SSEServerTransport>();

  app.use((req: Request, res: Response, next) => {
    if (!deps.validateToken(extractToken(req))) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });

  app.get(SSE_PATH, async (_req: Request, res: Response) => {
    const transport = new SSEServerTransport(MESSAGES_PATH, res);
    transports.set(transport.sessionId, transport);
    res.on('close', () => {
      transports.delete(transport.sessionId);
    });
    const server = deps.serverFactory();
    await server.connect(transport);
  });

  app.post(MESSAGES_PATH, async (req: Request, res: Response) => {
    const sessionId = String(req.query.sessionId ?? '');
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Unknown session' });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  return app;
}

/** Arranca el servidor HTTP/SSE escuchando solo en 127.0.0.1. */
export function startHttpSse(deps: HttpSseDeps & { port: number }): Promise<HttpSseHandle> {
  return new Promise((resolve, reject) => {
    const app = createHttpSseApp(deps);
    const httpServer: HttpServer = app.listen(deps.port, '127.0.0.1');
    httpServer.once('listening', () => {
      deps.log?.(`MCP HTTP/SSE escuchando en 127.0.0.1:${deps.port}`);
      resolve({
        port: deps.port,
        close: () =>
          new Promise<void>((res, rej) => {
            httpServer.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
    httpServer.once('error', reject);
  });
}
