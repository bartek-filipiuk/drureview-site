/**
 * Cloudflare Pages Function middleware — HTTP Basic auth dla /internal/*
 *
 * Setup po deploy:
 *   1. Cloudflare Pages dashboard → twój project → Settings → Environment variables
 *   2. Dodaj zmienne:
 *      INTERNAL_USER=admin
 *      INTERNAL_PASS=<openssl rand -hex 16>
 *   3. Save + Redeploy
 *
 * Dev mode (Astro dev): functions NIE są uruchamiane — strona otwarta.
 *   Dla dev użyj client-side gate w business.astro (drugi layer).
 *
 * Production: ten middleware blokuje wszystko pod /internal/* przez Basic auth.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const expectedUser = env.INTERNAL_USER || 'admin';
  const expectedPass = env.INTERNAL_PASS;

  // Jeśli nie skonfigurowano hasła w env — block z 500
  if (!expectedPass) {
    return new Response(
      'Server not configured: INTERNAL_PASS missing in Cloudflare Pages env vars.',
      { status: 500 }
    );
  }

  const auth = request.headers.get('Authorization');
  if (!auth || !auth.toLowerCase().startsWith('basic ')) {
    return new Response('Authentication required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Internal docs"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // Decode + compare (constant-time-ish)
  let user, pass;
  try {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(':');
    user = decoded.slice(0, idx);
    pass = decoded.slice(idx + 1);
  } catch {
    return new Response('Invalid credentials format.', { status: 400 });
  }

  const userMatch = user === expectedUser;
  const passMatch = pass === expectedPass;
  if (!(userMatch && passMatch)) {
    return new Response('Forbidden.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Internal docs"' },
    });
  }

  return context.next();
}
