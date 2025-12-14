import dotenv from 'dotenv';

dotenv.config();

type Env = {
  PORT: number;
  LOG_LEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  DATABASE_URL: string;
  JWT_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  BCRYPT_ROUNDS: number;
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function parseNumber(name: string, def?: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') {
    if (def != null) return def;
    throw new Error(`Missing required numeric env var: ${name}`);
  }
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid numeric env var ${name}: ${raw}`);
  }
  return n;
}

function parseLogLevel(name: string, def: Env['LOG_LEVEL']): Env['LOG_LEVEL'] {
  const raw = process.env[name] || def;
  const allowed = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
  if (!allowed.includes(raw as Env['LOG_LEVEL'])) {
    return def;
  }
  return raw as Env['LOG_LEVEL'];
}

export const env: Env = {
  PORT: parseNumber('PORT', 4000),
  LOG_LEVEL: parseLogLevel('LOG_LEVEL', 'info'),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  REFRESH_TOKEN_SECRET: required('REFRESH_TOKEN_SECRET'),
  BCRYPT_ROUNDS: parseNumber('BCRYPT_ROUNDS', 10),
};
