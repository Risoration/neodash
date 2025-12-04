// API functions for dashboard data fetching

export type SectionStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface SectionResponse {
  status: SectionStatus;
  data: any;
  isUnauthorized?: boolean;
}

export interface FocusSessionResponse {
  session: any | null;
}

export interface BlockedSitesResponse {
  blockedSites: string[];
  blockedSitesCount: number;
}

// Generic section fetcher
export async function fetchSection(
  path: string,
  signal?: AbortSignal
): Promise<SectionResponse> {
  try {
    const res = await fetch(path, { signal });
    if (!res.ok) {
      if (res.status === 401) {
        // Unauthorized - should redirect to login
        return { status: 'error', data: null, isUnauthorized: true };
      }
      // Other errors (404, 500, etc.) - treat as empty/error but don't redirect
      return { status: 'error', data: null, isUnauthorized: false };
    }

    if (res.status === 204) {
      return { status: 'empty', data: null };
    }

    const payload = await res.json();
    if (payload?.needsSetup) {
      return { status: 'empty', data: null, isUnauthorized: false };
    } else {
      return {
        status: 'ready',
        data: payload?.data ?? payload,
        isUnauthorized: false,
      };
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Dashboard fetch error:', error);
      return { status: 'error', data: null, isUnauthorized: false };
    }
    return { status: 'error', data: null, isUnauthorized: false };
  }
}

// Fetch focus session
export async function fetchFocusSession(): Promise<FocusSessionResponse> {
  try {
    const res = await fetch('/api/productivity/focus/session');
    if (res.ok) {
      const data = await res.json();
      return { session: data.session || null };
    }
    return { session: null };
  } catch (error) {
    console.error('Error fetching focus session:', error);
    return { session: null };
  }
}

// Fetch blocked sites
export async function fetchBlockedSites(): Promise<BlockedSitesResponse> {
  try {
    const res = await fetch('/api/user/preferences');
    if (res.ok) {
      const data = await res.json();
      const sites = data.preferences?.blockedSites || [];
      return {
        blockedSites: sites,
        blockedSitesCount: sites.length,
      };
    }
    return { blockedSites: [], blockedSitesCount: 0 };
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return { blockedSites: [], blockedSitesCount: 0 };
  }
}

// Fetch productivity data
export async function fetchProductivity(): Promise<any> {
  try {
    const res = await fetch('/api/productivity');
    if (res.ok) {
      const data = await res.json();
      return data.data || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching productivity:', error);
    return null;
  }
}

// Start focus session
export async function startFocusSession(): Promise<FocusSessionResponse> {
  try {
    const res = await fetch('/api/productivity/focus/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    if (res.ok) {
      const data = await res.json();
      return { session: data.session || null };
    }
    throw new Error('Failed to start focus session');
  } catch (error) {
    console.error('Error starting focus:', error);
    throw error;
  }
}

// End focus session
export async function endFocusSession(): Promise<FocusSessionResponse> {
  try {
    const res = await fetch('/api/productivity/focus/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    });
    if (res.ok) {
      const data = await res.json();
      return { session: data.session || null };
    }
    throw new Error('Failed to end focus session');
  } catch (error) {
    console.error('Error ending focus:', error);
    throw error;
  }
}

// Take break
export async function takeBreak(
  breakDurationMinutes: number
): Promise<FocusSessionResponse> {
  try {
    const res = await fetch('/api/productivity/focus/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'take_break',
        breakDurationMinutes,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return { session: data.session || null };
    }
    throw new Error('Failed to take break');
  } catch (error) {
    console.error('Error taking break:', error);
    throw error;
  }
}

// Resume focus
export async function resumeFocus(): Promise<FocusSessionResponse> {
  try {
    const res = await fetch('/api/productivity/focus/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    if (res.ok) {
      const data = await res.json();
      return { session: data.session || null };
    }
    throw new Error('Failed to resume focus');
  } catch (error) {
    console.error('Error resuming focus:', error);
    throw error;
  }
}
