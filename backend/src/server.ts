import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
app.listen(env.PORT, env.HOST, () => {
  console.log(`API listening on http://${env.HOST}:${env.PORT}`);
});
