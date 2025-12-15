# Environment Variables Reference

Backend (Node/Express)
- PORT: API port (default 4000)
- HOST: Bind address (default 127.0.0.1 for Windows stability)
- LOG_LEVEL: pino log level (default info)
- DATABASE_URL: Postgres connection string (required)
- JWT_SECRET: JWT signing secret for access tokens (required)
- REFRESH_TOKEN_SECRET: JWT/opaque secret for refresh tokens (required)
- BCRYPT_ROUNDS: bcrypt salt rounds (default 10)

Guidelines
- Never commit real secrets. Keep `.env.example` updated for onboarding.
- Refresh tokens are httpOnly cookies — never expose to frontend code.
- Prefer `127.0.0.1` over `localhost` on Windows to avoid IPv6 pitfalls.
