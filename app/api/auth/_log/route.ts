import { NextResponse } from 'next/server';

// NextAuth tries to POST to this endpoint for logging
// We'll just return 200 OK to prevent 405 errors
export async function POST() {
  return NextResponse.json({ success: true }, { status: 200 });
}

