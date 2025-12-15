# Vite Dev Proxy (Frontend)

Goal
- Route `/api` requests from the Vite dev server to the backend during development.

Example (vite.config.ts)
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
```

Notes
- Use `127.0.0.1` to avoid IPv6 issues on Windows.
- Keep refresh tokens as httpOnly cookies; do not expose in JS.
