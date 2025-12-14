import * as jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export type AccessTokenPayload = {
  sub: string; // user id
  orgId?: string; // current org context
  roles?: string[]; // optional roles/claims
};

export type RefreshTokenPayload = {
  sub: string; // user id
  tokenId: string; // rotation id
};

export function signAccessToken(payload: AccessTokenPayload, expiresIn: string = '15m') {
  return jwt.sign(payload as any, env.JWT_SECRET as jwt.Secret, { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload, expiresIn: string = '7d') {
  return jwt.sign(payload as any, env.REFRESH_TOKEN_SECRET as jwt.Secret, { expiresIn } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
}
