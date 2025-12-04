import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getActiveFocusSession,
  createFocusSession,
  updateFocusSession,
  startBreak,
  resumeFocus,
  endFocusSession,
  getUserConfig,
  readUserConfigs,
  syncFocusSessionToProductivity,
} from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = getActiveFocusSession(user.id);
  if (!session) {
    return NextResponse.json({ session: null });
  }

  // Calculate current focus time if active
  // We need to track time since session started, minus break time
  let currentFocusSeconds = session.totalFocusSeconds || 0;
  if (session.status === 'active') {
    const startTime = new Date(session.startedAt).getTime();
    const now = Date.now();
    const totalElapsed = Math.floor((now - startTime) / 1000);
    const breakTime = session.totalBreakSeconds || 0;
    // Current focus = total elapsed - break time
    currentFocusSeconds = Math.max(0, totalElapsed - breakTime);
  }

  // Calculate remaining break time if on break
  let remainingBreakSeconds = 0;
  if (session.status === 'on_break' && session.breakEndsAt) {
    const breakEnd = new Date(session.breakEndsAt).getTime();
    remainingBreakSeconds = Math.max(
      0,
      Math.floor((breakEnd - Date.now()) / 1000)
    );
  }

  return NextResponse.json({
    session: {
      ...session,
      currentFocusSeconds,
      remainingBreakSeconds,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      const session = createFocusSession(user.id);
      syncFocusSessionToProductivity(user.id);
      return NextResponse.json({ session });
    }

    if (action === 'end') {
      const activeSession = getActiveFocusSession(user.id);
      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active session' },
          { status: 400 }
        );
      }
      const endedSession = endFocusSession(activeSession.id);
      syncFocusSessionToProductivity(user.id);
      return NextResponse.json({ session: endedSession });
    }

    if (action === 'take_break') {
      const { breakDurationMinutes } = body;
      if (!breakDurationMinutes || breakDurationMinutes <= 0) {
        return NextResponse.json(
          { error: 'Invalid break duration' },
          { status: 400 }
        );
      }

      const activeSession = getActiveFocusSession(user.id);
      if (!activeSession || activeSession.status !== 'active') {
        return NextResponse.json(
          { error: 'No active focus session' },
          { status: 400 }
        );
      }

      // Calculate and save current focus time before break
      const startTime = new Date(activeSession.startedAt).getTime();
      const now = Date.now();
      const totalElapsed = Math.floor((now - startTime) / 1000);
      const breakTime = activeSession.totalBreakSeconds || 0;

      // Current focus time = total elapsed - break time
      const currentFocusTime = Math.max(0, totalElapsed - breakTime);
      const updatedSession = updateFocusSession(activeSession.id, {
        totalFocusSeconds: currentFocusTime,
        lastUpdatedAt: new Date().toISOString(),
      });

      if (!updatedSession) {
        return NextResponse.json(
          { error: 'Failed to update session' },
          { status: 500 }
        );
      }

      const breakSession = startBreak(updatedSession.id, breakDurationMinutes);
      syncFocusSessionToProductivity(user.id);
      return NextResponse.json({ session: breakSession });
    }

    if (action === 'resume') {
      const activeSession = getActiveFocusSession(user.id);
      if (!activeSession || activeSession.status !== 'on_break') {
        return NextResponse.json({ error: 'No active break' }, { status: 400 });
      }

      const resumedSession = resumeFocus(activeSession.id);
      syncFocusSessionToProductivity(user.id);
      return NextResponse.json({ session: resumedSession });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Focus session error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Extension-friendly endpoint that returns minimal data
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Find user by extension API key
    const configs = readUserConfigs();
    const userId = Object.keys(configs).find(
      (id) => configs[id]?.preferences?.extensionApiKey === apiKey
    );

    if (!userId) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const session = getActiveFocusSession(userId);
    const config = getUserConfig(userId);
    const blockedSites = config?.preferences?.blockedSites || [];

    // Calculate current focus time if active
    let currentFocusSeconds = 0;
    let isFocusing = false;
    let isOnBreak = false;
    let breakEndsAt: string | undefined;

    if (session) {
      if (session.status === 'active') {
        isFocusing = true;
        const lastUpdate = new Date(session.lastUpdatedAt).getTime();
        const elapsed = Math.floor((Date.now() - lastUpdate) / 1000);
        currentFocusSeconds = session.totalFocusSeconds + elapsed;
      } else if (session.status === 'on_break') {
        isOnBreak = true;
        breakEndsAt = session.breakEndsAt;
      }
    }

    return NextResponse.json({
      isFocusing,
      isOnBreak,
      blockedSites,
      breakEndsAt,
      currentFocusSeconds,
    });
  } catch (error) {
    console.error('Extension sync error:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
}
