import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../db/prisma';
import { OrgRole } from '@prisma/client';

export function requireRole(allowed: OrgRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orgId = req.params.orgId || req.params.id; // support both patterns
    const userId = req.user?.id;
    if (!orgId || !userId) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    const membership = await prisma.membership.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (!membership || !allowed.includes(membership.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    next();
  };
}
