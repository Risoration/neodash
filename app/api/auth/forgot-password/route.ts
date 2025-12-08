import { NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    
    // Always return success to prevent email enumeration
    // Don't reveal whether the email exists or not
    if (user) {
      try {
        // Create reset token
        const token = await createPasswordResetToken(user.id);
        
        // Send reset email
        await sendPasswordResetEmail(email, token, user.name);
      } catch (error) {
        // Log error but don't expose it to the user
        console.error('Error sending password reset email:', error);
      }
    }

    // Always return the same success message
    return NextResponse.json({
      message: 'If an account with that email exists, we have sent a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

