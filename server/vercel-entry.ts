import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from './app';

const app = createApiApp();

export function createVercelHandler(fixedPath?: string) {
  return function handler(req: IncomingMessage, res: ServerResponse) {
    if (fixedPath) {
      const rawUrl = req.url || '/';
      const qIdx = rawUrl.indexOf('?');
      const qs = qIdx !== -1 ? rawUrl.slice(qIdx) : '';
      req.url = `${fixedPath}${qs}`;
    }
    return app(req as any, res as any);
  };
}

export default createVercelHandler();
