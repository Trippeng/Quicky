import axios from 'axios';

async function run() {
  const base = 'http://localhost:4000/api/auth';
  const client = axios.create({ baseURL: base, validateStatus: () => true });

  // Login
  const login = await client.post('/login', { email: 'demo@example.com', password: 'Demo1234' });
  console.log('LOGIN status:', login.status, 'body:', login.data);
  const setCookie = login.headers['set-cookie'];
  if (!setCookie) {
    console.error('No Set-Cookie from login; refresh may fail in this harness');
  }

  // Extract cookie value
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const rtCookie = cookieHeader ? cookieHeader.split(';')[0] : '';

  // Refresh
  const refresh = await client.post('/refresh', {}, { headers: { Cookie: rtCookie } });
  console.log('REFRESH status:', refresh.status, 'body:', refresh.data);

  // Logout
  const logout = await client.post('/logout', {}, { headers: { Cookie: rtCookie } });
  console.log('LOGOUT status:', logout.status, 'body:', logout.data);
}

run().catch((e) => {
  console.error('Auth test failed:', e.message);
});
