/**
 * Email utility for sending password reset emails using Resend
 * 
 * Requires:
 * - RESEND_API_KEY: Your Resend API key
 * - EMAIL_FROM: The sender email address (e.g., noreply@yourdomain.com)
 * 
 * In development, if RESEND_API_KEY is not set, emails will be logged to console.
 */

import { Resend } from 'resend';

function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

function createEmailTemplate(resetUrl: string, userName?: string): string {
  const name = userName || 'User';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello ${name},
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                You requested to reset your password. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 20px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 30px; word-break: break-all;">
                <a href="${resetUrl}" style="color: #667eea; text-decoration: none; font-size: 14px;">${resetUrl}</a>
              </p>
              
              <!-- Security Notice -->
              <div style="margin-top: 30px; padding: 16px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #333333; font-size: 14px; font-weight: 600;">
                  ⏰ This link will expire in 1 hour
                </p>
                <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.5;">
                  If you did not request this password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function createPlainTextEmail(resetUrl: string, userName?: string): string {
  const name = userName || 'User';
  
  return `
Reset Your Password

Hello ${name},

You requested to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

This is an automated message. Please do not reply to this email.
  `.trim();
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName?: string
): Promise<void> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  // Development fallback: log to console if API key is not set
  if (!apiKey) {
    console.log('='.repeat(60));
    console.log('Password Reset Email (Resend API key not configured)');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`From: ${fromEmail}`);
    console.log(`Subject: Reset Your Password`);
    console.log(`\nHello ${userName || 'User'},\n`);
    console.log('You requested to reset your password. Click the link below to reset it:');
    console.log(`\n${resetUrl}\n`);
    console.log('This link will expire in 1 hour.');
    console.log('If you did not request this, please ignore this email.');
    console.log('\nTo enable email sending, set RESEND_API_KEY in your environment variables.');
    console.log('='.repeat(60));
    return;
  }

  // Send email using Resend
  try {
    const resend = new Resend(apiKey);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset Your Password',
      html: createEmailTemplate(resetUrl, userName),
      text: createPlainTextEmail(resetUrl, userName),
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    if (data) {
      console.log('Password reset email sent successfully:', data.id);
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to send email: ${error.message}` 
        : 'Failed to send email. Please try again later.'
    );
  }
}

