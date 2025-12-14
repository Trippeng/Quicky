import bcrypt from 'bcrypt';
import { env } from '../../config/env';

export async function hashPassword(plain: string) {
  const rounds = env.BCRYPT_ROUNDS;
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
