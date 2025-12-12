import { NextResponse } from 'next/server';

// NextAuth tries to POST to this endpoint for logging
// We'll just return 200 OK to prevent 405 errors
export async function POST() {
  return NextResponse.json({ success: true }, { status: 200 });
}

// Return 405 for GET requests to prevent caching issues
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

// Prevent caching of this endpoint (critical for POST requests)
export const dynamic = 'force-dynamic';
