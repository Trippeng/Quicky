import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/tokens';

export interface AuthRequest extends Request {
  user?: { id: string; orgId?: string; roles?: string[] };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, orgId: payload.orgId, roles: payload.roles };
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
}
