import { NextResponse } from 'next/server';
import {
  getPlaidItems,
  getPlaidItemByItemId,
  updatePlaidItemLastSynced,
  deletePlaidItem,
} from '@/lib/db';
import { getItem, isPlaidError } from '@/lib/plaid';

/**
 * Plaid Webhook Handler
 *
 * Receives webhooks from Plaid for important events like:
 * - ITEM_LOGIN_REQUIRED: User needs to re-authenticate
 * - TRANSACTIONS: New transactions available
 * - ERROR: Item errors
 *
 * Configure this URL in your Plaid Dashboard:
 * https://dashboard.plaid.com/team/webhooks
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhook_type, webhook_code, item_id, error } = body;

    console.log('Plaid webhook received:', {
      webhook_type,
      webhook_code,
      item_id,
    });

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        if (
          webhook_code === 'INITIAL_UPDATE' ||
          webhook_code === 'HISTORICAL_UPDATE'
        ) {
          // New transactions available - you might want to trigger a sync
          console.log(`Transactions available for item ${item_id}`);
          // Optionally trigger an automatic sync here
        } else if (webhook_code === 'DEFAULT_UPDATE') {
          // New transactions since last update
          console.log(`New transactions available for item ${item_id}`);
        }
        break;

      case 'ITEM':
        if (webhook_code === 'ERROR') {
          // Item error occurred
          console.error(`Item error for ${item_id}:`, error);

          // Find the user who owns this item and handle the error
          // This is a simplified version - you'd want to query by item_id
          // For now, we'll log it and the next sync attempt will handle it
        } else if (webhook_code === 'LOGIN_REQUIRED') {
          // User needs to re-authenticate
          console.warn(`Login required for item ${item_id}`);
          // You might want to notify the user or mark the item as needing re-authentication
        } else if (webhook_code === 'PENDING_EXPIRATION') {
          // Access token will expire soon
          console.warn(`Access token expiring soon for item ${item_id}`);
        }
        break;

      case 'AUTH':
        if (webhook_code === 'AUTOMATICALLY_VERIFIED') {
          // Account verification completed
          console.log(`Account automatically verified for item ${item_id}`);
        }
        break;

      default:
        console.log('Unhandled webhook type:', webhook_type);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Plaid from retrying
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}

// Plaid webhooks require GET endpoint for verification
export async function GET() {
  return NextResponse.json({
    message: 'Plaid webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
