import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from './app';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const urlStr = req.url || '/';
  const qIdx = urlStr.indexOf('?');
  if (qIdx !== -1) {
    const params = new URLSearchParams(urlStr.slice(qIdx + 1));
    const pathParam = params.get('__path');
    if (pathParam !== null) {
      params.delete('__path');
      const remainingQs = params.toString();
      const cleanPath = pathParam.replace(/^\/+/, '');
      req.url = `/api/${cleanPath}${remainingQs ? `?${remainingQs}` : ''}`;
    }
  }
  return app(req as any, res as any);
}
