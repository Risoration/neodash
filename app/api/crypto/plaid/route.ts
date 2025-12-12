import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getInvestmentHoldings } from '@/lib/plaid';
import {
  getUserData,
  updateUserDataSection,
  CryptoData,
  CryptoCoin,
  getPlaidItemByItemId,
  getPlaidItems,
} from '@/lib/db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, item_id } = body;

    if (action === 'sync') {
      if (!item_id) {
        return NextResponse.json(
          { error: 'item_id is required' },
          { status: 400 }
        );
      }

      // Get Plaid item
      const plaidItem = await getPlaidItemByItemId(user.id, item_id);
      if (!plaidItem) {
        return NextResponse.json(
          { error: 'Plaid item not found' },
          { status: 404 }
        );
      }

      // Fetch investment holdings (crypto)
      const holdingsData = await getInvestmentHoldings(plaidItem.accessToken);
      if (!holdingsData) {
        return NextResponse.json(
          { error: 'Failed to fetch crypto holdings' },
          { status: 500 }
        );
      }

      // Convert Plaid holdings to our crypto format
      const cryptoCoins: CryptoCoin[] = [];
      const holdingsMap = new Map<string, number>();

      // Aggregate holdings by security
      holdingsData.holdings?.forEach((holding: any) => {
        const securityId = holding.security_id;
        const quantity = holding.quantity || 0;
        holdingsMap.set(
          securityId,
          (holdingsMap.get(securityId) || 0) + quantity
        );
      });

      // Get security details and create crypto coins
      holdingsData.securities?.forEach((security: any) => {
        const quantity = holdingsMap.get(security.security_id) || 0;
        if (quantity > 0 && security.ticker_symbol) {
          // Map ticker to symbol (e.g., BTC, ETH)
          const symbol = security.ticker_symbol.toUpperCase();
          const price = security.close_price || 0;
          const value = quantity * price;

          cryptoCoins.push({
            symbol,
            name: security.name || symbol,
            holdings: quantity,
            price,
            value,
            change24h: 0, // Plaid doesn't provide 24h change in holdings
          });
        }
      });

      if (cryptoCoins.length === 0) {
        return NextResponse.json(
          { error: 'No crypto holdings found' },
          { status: 404 }
        );
      }

      // Calculate total value
      const totalValue = cryptoCoins.reduce((sum, coin) => sum + coin.value, 0);

      // Get existing crypto data
      const userData = await getUserData(user.id);
      const existingCrypto = userData?.crypto;

      // Merge with existing holdings (if any)
      const existingCoins = existingCrypto?.coins || [];
      const mergedCoins = [...existingCoins];

      // Update or add coins from Plaid
      cryptoCoins.forEach((newCoin) => {
        const existingIndex = mergedCoins.findIndex(
          (c) => c.symbol === newCoin.symbol
        );
        if (existingIndex >= 0) {
          // Update existing coin
          mergedCoins[existingIndex] = {
            ...mergedCoins[existingIndex],
            holdings: newCoin.holdings,
            price: newCoin.price,
            value: newCoin.value,
          };
        } else {
          // Add new coin
          mergedCoins.push(newCoin);
        }
      });

      // Create crypto data payload
      const cryptoData: CryptoData = {
        totalValue: mergedCoins.reduce((sum, coin) => sum + coin.value, 0),
        change24h: existingCrypto?.change24h || 0,
        coins: mergedCoins,
        history: existingCrypto?.history || [],
      };

      // Update user data
      await updateUserDataSection(user.id, 'crypto', cryptoData);

      return NextResponse.json({
        success: true,
        holdings: cryptoCoins.length,
        totalValue: cryptoData.totalValue,
      });
    }

    if (action === 'get_items') {
      const items = await getPlaidItems(user.id);
      // Filter for investment/crypto items only
      const cryptoItems = items.filter((item) =>
        item.institutionName?.toLowerCase().includes('crypto') ||
        item.institutionName?.toLowerCase().includes('exchange') ||
        item.institutionName?.toLowerCase().includes('binance') ||
        item.institutionName?.toLowerCase().includes('coinbase') ||
        item.institutionName?.toLowerCase().includes('kraken')
      );

      return NextResponse.json({ items: cryptoItems });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Crypto Plaid API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

