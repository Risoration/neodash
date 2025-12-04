// Crypto connection utilities for fetching portfolio data from various sources

export type CryptoConnectionMethod = "exchange" | "wallet" | "browser-wallet" | "manual";

export interface ExchangeCredentials {
  exchange: "binance" | "coinbase" | "kraken";
  apiKey: string;
  apiSecret: string;
}

export interface WalletAddress {
  chain: "ethereum" | "bitcoin" | "solana";
  address: string;
}

export interface CryptoHolding {
  symbol: string;
  name: string;
  holdings: number;
  price: number;
  value: number;
  change24h?: number;
}

// Fetch holdings from Binance exchange
export async function fetchBinanceHoldings(
  apiKey: string,
  apiSecret: string
): Promise<CryptoHolding[]> {
  // Note: In production, this should be done server-side for security
  // This is a simplified example - actual implementation requires HMAC signing
  try {
    // For now, return empty - full implementation requires server-side proxy
    // to protect API keys
    return [];
  } catch (error) {
    console.error("Binance API error:", error);
    throw new Error("Failed to fetch Binance holdings");
  }
}

// Fetch holdings from Coinbase exchange
export async function fetchCoinbaseHoldings(
  apiKey: string,
  apiSecret: string
): Promise<CryptoHolding[]> {
  try {
    // Similar to Binance - requires server-side implementation
    return [];
  } catch (error) {
    console.error("Coinbase API error:", error);
    throw new Error("Failed to fetch Coinbase holdings");
  }
}

// Fetch balance for Ethereum wallet address
export async function fetchEthereumBalance(address: string): Promise<CryptoHolding[]> {
  try {
    // Use Etherscan API or similar
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=YourApiKeyToken`
    );
    const data = await response.json();
    
    if (data.status === "1") {
      const balance = parseFloat(data.result) / 1e18; // Convert from Wei
      // Fetch ETH price
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true"
      );
      const priceData = await priceRes.json();
      const ethPrice = priceData.ethereum?.usd || 0;
      const change24h = priceData.ethereum?.usd_24h_change || 0;

      if (balance > 0) {
        return [
          {
            symbol: "ETH",
            name: "Ethereum",
            holdings: balance,
            price: ethPrice,
            value: balance * ethPrice,
            change24h,
          },
        ];
      }
    }
    return [];
  } catch (error) {
    console.error("Ethereum balance fetch error:", error);
    return [];
  }
}

// Fetch balance for Bitcoin wallet address
export async function fetchBitcoinBalance(address: string): Promise<CryptoHolding[]> {
  try {
    // Use Blockchain.info API or similar
    const response = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
    const balanceSatoshis = await response.text();
    const balance = parseFloat(balanceSatoshis) / 1e8; // Convert from satoshis

    if (balance > 0) {
      // Fetch BTC price
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
      );
      const priceData = await priceRes.json();
      const btcPrice = priceData.bitcoin?.usd || 0;
      const change24h = priceData.bitcoin?.usd_24h_change || 0;

      return [
        {
          symbol: "BTC",
          name: "Bitcoin",
          holdings: balance,
          price: btcPrice,
          value: balance * btcPrice,
          change24h,
        },
      ];
    }
    return [];
  } catch (error) {
    console.error("Bitcoin balance fetch error:", error);
    return [];
  }
}

// Fetch balance for Solana wallet address
export async function fetchSolanaBalance(address: string): Promise<CryptoHolding[]> {
  try {
    // Use Solana RPC endpoint
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });
    const data = await response.json();
    const balanceLamports = data.result?.value || 0;
    const balance = balanceLamports / 1e9; // Convert from lamports

    if (balance > 0) {
      // Fetch SOL price
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true"
      );
      const priceData = await priceRes.json();
      const solPrice = priceData.solana?.usd || 0;
      const change24h = priceData.solana?.usd_24h_change || 0;

      return [
        {
          symbol: "SOL",
          name: "Solana",
          holdings: balance,
          price: solPrice,
          value: balance * solPrice,
          change24h,
        },
      ];
    }
    return [];
  } catch (error) {
    console.error("Solana balance fetch error:", error);
    return [];
  }
}

// Fetch balances for multiple wallet addresses
export async function fetchWalletBalances(
  wallets: WalletAddress[]
): Promise<CryptoHolding[]> {
  const allHoldings: CryptoHolding[] = [];

  for (const wallet of wallets) {
    try {
      let holdings: CryptoHolding[] = [];
      switch (wallet.chain) {
        case "ethereum":
          holdings = await fetchEthereumBalance(wallet.address);
          break;
        case "bitcoin":
          holdings = await fetchBitcoinBalance(wallet.address);
          break;
        case "solana":
          holdings = await fetchSolanaBalance(wallet.address);
          break;
      }
      allHoldings.push(...holdings);
    } catch (error) {
      console.error(`Error fetching ${wallet.chain} balance:`, error);
    }
  }

  return allHoldings;
}

// Browser wallet connection (MetaMask, etc.)
export async function connectBrowserWallet(): Promise<CryptoHolding[]> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No browser wallet detected");
  }

  try {
    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    
    if (accounts.length === 0) {
      throw new Error("No accounts found");
    }

    const address = accounts[0];
    return await fetchEthereumBalance(address);
  } catch (error) {
    console.error("Browser wallet connection error:", error);
    throw error;
  }
}

