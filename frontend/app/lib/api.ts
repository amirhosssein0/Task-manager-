import { API_BASE } from './config';

let refreshPromise: Promise<string | null> | null = null;

/**
 * Check if a JWT token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpiredOrExpiringSoon(token: string | null): boolean {
  if (!token) return true;

  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (payload?.exp) {
      // Check if token expires within 5 minutes (300000 ms)
      const expiresIn = payload.exp * 1000 - Date.now();
      return expiresIn < 300000; // 5 minutes
    }
  } catch (error) {
    return true;
  }
  return true;
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access) {
          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }
          // Notify other components about auth change
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth-change'));
          }
          return data.access;
        }
      } else {
        // Refresh token expired or invalid
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-change'));
        }
        return null;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  let accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    return null;
  }

  // Check if token is expired or expiring soon
  if (isTokenExpiredOrExpiringSoon(accessToken)) {
    accessToken = await refreshAccessToken();
  }

  return accessToken;
}

/**
 * Fetch wrapper that automatically handles token refresh
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    // Return a response that will trigger redirect to login
    return new Response(
      JSON.stringify({ detail: 'Authentication required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get 401, try refreshing token once and retry
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed, clear tokens and notify
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
      }
    }
  }

  return response;
}

/**
 * Get auth headers for manual fetch calls
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

