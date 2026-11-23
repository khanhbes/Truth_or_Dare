/**
 * Admin sign-in lives in front of the app: Cloudflare Access protects
 * `/admin` and `/api/admin/*`, so "logging in as admin" means passing the
 * Access login for an allowed admin email. The app only needs to know whether
 * that login already exists, to label the switch button.
 */
export const ADMIN_PATH = '/admin';
/** Cloudflare Access sign-out endpoint for this hostname. */
export const ADMIN_LOGOUT_PATH = '/cdn-cgi/access/logout';

export interface AdminSessionInfo {
  loggedIn: boolean;
  email?: string;
}

let cached: Promise<AdminSessionInfo> | null = null;

export const checkAdminSession = (): Promise<AdminSessionInfo> => {
  cached ??= fetch('/api/admin/session', {
    credentials: 'same-origin',
    cache: 'no-store',
    // Without an Access login the edge answers with a redirect to the
    // Access login page; don't follow it, it only means "not signed in".
    redirect: 'manual',
  })
    .then(async (response) => {
      if (!response.ok) return { loggedIn: false };
      const body = await response.json().catch(() => null) as { authenticated?: boolean; email?: string } | null;
      return body?.authenticated ? { loggedIn: true, email: body.email } : { loggedIn: false };
    })
    .catch(() => ({ loggedIn: false }));
  return cached;
};

export const goToAdmin = () => {
  window.location.assign(ADMIN_PATH);
};
