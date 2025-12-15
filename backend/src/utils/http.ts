import { Response } from 'express';
import { ZodError } from 'zod';

export function sendError(res: Response, status: number, message: string, errors?: any) {
  return res.status(status).json({ status: 'error', message, ...(errors ? { errors } : {}) });
}

export function sendZodError(res: Response, parsed: any) {
  const issues = parsed?.error instanceof ZodError ? parsed.error.issues : parsed?.error?.issues;
  return res.status(400).json({ status: 'error', message: 'Invalid payload', errors: issues });
}
