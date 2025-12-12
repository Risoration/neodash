import { NextResponse } from 'next/server';

// NextAuth tries to POST to this endpoint for logging
// It sends data as URLSearchParams (form data) via sendBeacon or fetch
// We'll just return 200 OK to prevent 405 errors
export async function POST(request: Request) {
  // NextAuth sends URLSearchParams, but we don't need to process it
  // Just consume the body to prevent errors and return success
  try {
    // Try to read as form data (URLSearchParams format)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      await request.formData();
    } else {
      // Fallback: read as text
      await request.text();
    }
  } catch (e) {
    // Ignore parsing errors - just return success
    // The important thing is we accept the POST request
  }

  // Return 200 OK - NextAuth just needs a successful response
  return new NextResponse(null, { status: 200 });
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
