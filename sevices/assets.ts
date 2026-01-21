
export type AssetCategory = 'CRYPTO' | 'FOREX' | 'INDICES' | 'COMMODITIES' | 'STOCKS';

export interface AssetDefinition {
    symbol: string;
    name: string;
    category: AssetCategory;
    provider: 'binance' | 'twelve' | 'finnhub';
}

export const MASTER_ASSETS: AssetDefinition[] = [
    // --- CRYPTO (Binance) ---
    { symbol: 'BTCUSD', name: 'Bitcoin', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'ETHUSD', name: 'Ethereum', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'SOLUSD', name: 'Solana', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'BNBUSD', name: 'Binance Coin', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'XRPUSD', name: 'Ripple', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'ADAUSD', name: 'Cardano', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'DOGEUSD', name: 'Dogecoin', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'MATICUSD', name: 'Polygon', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'LTCUSD', name: 'Litecoin', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'DOTUSD', name: 'Polkadot', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'AVAXUSD', name: 'Avalanche', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'LINKUSD', name: 'Chainlink', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'UNIUSD', name: 'Uniswap', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'SHIBUSD', name: 'Shiba Inu', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'NEARUSD', name: 'Near Protocol', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'ATOMUSD', name: 'Cosmos', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'ETCUSD', name: 'Ethereum Classic', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'FILUSD', name: 'Filecoin', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'HBARUSD', name: 'Hedera', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'ICPUSD', name: 'Internet Computer', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'VETUSD', name: 'VeChain', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'ALGOUSD', name: 'Algorand', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'SANDUSD', name: 'The Sandbox', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'MANAUSD', name: 'Decentraland', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'AAVEUSD', name: 'Aave', category: 'CRYPTO', provider: 'binance' },
    // NEW CRYPTO
    { symbol: 'PEPEUSD', name: 'Pepe', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'WIFUSD', name: 'dogwifhat', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'FETUSD', name: 'Fetch.ai', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'RNDRUSD', name: 'Render', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'INJUSD', name: 'Injective', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'TIAUSD', name: 'Celestia', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'SEIUSD', name: 'Sei', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'SUIUSD', name: 'Sui', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'APTUSD', name: 'Aptos', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'ARBUSD', name: 'Arbitrum', category: 'CRYPTO', provider: 'binance' },
    { symbol: 'OPUSD', name: 'Optimism', category: 'CRYPTO', provider: 'binance' },

    // --- FOREX MAJORS (Twelve/Finnhub) ---
    { symbol: 'EURUSD', name: 'Euro / USD', category: 'FOREX', provider: 'twelve' },
    { symbol: 'GBPUSD', name: 'British Pound / USD', category: 'FOREX', provider: 'twelve' },
    { symbol: 'USDJPY', name: 'USD / Jap Yen', category: 'FOREX', provider: 'twelve' },
    { symbol: 'AUDUSD', name: 'Aussie / USD', category: 'FOREX', provider: 'twelve' },
    { symbol: 'USDCAD', name: 'USD / Canadian Dollar', category: 'FOREX', provider: 'twelve' },
    { symbol: 'USDCHF', name: 'USD / Swiss Franc', category: 'FOREX', provider: 'twelve' },
    { symbol: 'NZDUSD', name: 'Kiwi / USD', category: 'FOREX', provider: 'twelve' },

    // --- FOREX CROSSES ---
    { symbol: 'EURJPY', name: 'Euro / Jap Yen', category: 'FOREX', provider: 'twelve' },
    { symbol: 'GBPJPY', name: 'Pound / Jap Yen', category: 'FOREX', provider: 'twelve' },
    { symbol: 'AUDJPY', name: 'Aussie / Jap Yen', category: 'FOREX', provider: 'twelve' },
    { symbol: 'EURGBP', name: 'Euro / Pound', category: 'FOREX', provider: 'twelve' },
    { symbol: 'EURAUD', name: 'Euro / Aussie', category: 'FOREX', provider: 'twelve' },
    { symbol: 'GBPAUD', name: 'Pound / Aussie', category: 'FOREX', provider: 'twelve' },
    { symbol: 'AUDNZD', name: 'Aussie / Kiwi', category: 'FOREX', provider: 'twelve' },
    { symbol: 'NZDJPY', name: 'Kiwi / Jap Yen', category: 'FOREX', provider: 'twelve' },
    { symbol: 'CADJPY', name: 'Loonie / Jap Yen', category: 'FOREX', provider: 'twelve' },
    { symbol: 'CHFJPY', name: 'Swiss / Jap Yen', category: 'FOREX', provider: 'twelve' },
    // NEW FOREX EXOTICS
    { symbol: 'USDMXN', name: 'USD / Mexican Peso', category: 'FOREX', provider: 'twelve' },
    { symbol: 'USDZAR', name: 'USD / S.African Rand', category: 'FOREX', provider: 'twelve' },
    { symbol: 'USDTRY', name: 'USD / Turkish Lira', category: 'FOREX', provider: 'twelve' },
    { symbol: 'USDCNH', name: 'USD / Chinese Yuan', category: 'FOREX', provider: 'twelve' },

    // --- INDICES (Twelve/Finnhub) ---
    { symbol: 'SPX', name: 'S&P 500', category: 'INDICES', provider: 'twelve' },
    { symbol: 'NDX', name: 'Nasdaq 100', category: 'INDICES', provider: 'twelve' },
    { symbol: 'DJI', name: 'Dow Jones 30', category: 'INDICES', provider: 'twelve' },
    { symbol: 'US2000', name: 'Russell 2000', category: 'INDICES', provider: 'twelve' },
    { symbol: 'GDAXI', name: 'DAX 40 (Germany)', category: 'INDICES', provider: 'twelve' },
    { symbol: 'FTSE', name: 'FTSE 100 (UK)', category: 'INDICES', provider: 'twelve' },
    { symbol: 'N225', name: 'Nikkei 225 (Japan)', category: 'INDICES', provider: 'twelve' },
    { symbol: 'HSI', name: 'Hang Seng (HK)', category: 'INDICES', provider: 'twelve' },
    { symbol: 'VIX', name: 'Volatility Index', category: 'INDICES', provider: 'twelve' },

    // --- COMMODITIES ---
    { symbol: 'XAUUSD', name: 'Gold', category: 'COMMODITIES', provider: 'twelve' },
    { symbol: 'XAGUSD', name: 'Silver', category: 'COMMODITIES', provider: 'twelve' },
    { symbol: 'WTI', name: 'US Oil (WTI)', category: 'COMMODITIES', provider: 'finnhub' },
    { symbol: 'BRENT', name: 'Brent Oil', category: 'COMMODITIES', provider: 'finnhub' },
    { symbol: 'XPTUSD', name: 'Platinum', category: 'COMMODITIES', provider: 'twelve' },
    { symbol: 'NG', name: 'Natural Gas', category: 'COMMODITIES', provider: 'finnhub' },

    // --- STOCKS (Tech & Blue Chips) ---
    { symbol: 'AAPL', name: 'Apple Inc.', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'TSLA', name: 'Tesla Inc.', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'NVDA', name: 'Nvidia Corp.', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'MSFT', name: 'Microsoft', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'AMZN', name: 'Amazon', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'META', name: 'Meta Platforms', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'NFLX', name: 'Netflix', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'COIN', name: 'Coinbase Global', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'MSTR', name: 'MicroStrategy', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'AMD', name: 'AMD', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'PLTR', name: 'Palantir Tech', category: 'STOCKS', provider: 'finnhub' },
    // NEW STOCKS (AI & Trending)
    { symbol: 'SMCI', name: 'Super Micro Comp', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'ARM', name: 'Arm Holdings', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'AVGO', name: 'Broadcom', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'ORCL', name: 'Oracle', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'INTC', name: 'Intel', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'RDDT', name: 'Reddit', category: 'STOCKS', provider: 'finnhub' },
    
    // --- STOCKS (Defensive & Banking) ---
    { symbol: 'JPM', name: 'JPMorgan Chase', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'BAC', name: 'Bank of America', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'GS', name: 'Goldman Sachs', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'KO', name: 'Coca-Cola', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'PEP', name: 'PepsiCo', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'MCD', name: 'McDonalds', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'WMT', name: 'Walmart', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'XOM', name: 'Exxon Mobil', category: 'STOCKS', provider: 'finnhub' },
    { symbol: 'CVX', name: 'Chevron', category: 'STOCKS', provider: 'finnhub' },
];

export const FOCUS_MODES = {
    'CRYPTO_CORE': ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD'],
    'CRYPTO_MEME': ['DOGEUSD', 'SHIBUSD', 'PEPEUSD', 'WIFUSD'],
    'AI_NARRATIVE': ['NVDA', 'SMCI', 'FETUSD', 'RNDRUSD', 'WLDUSD'],
    'DEFI_BLUE': ['UNIUSD', 'AAVEUSD', 'LINKUSD', 'MKRUSD'],
    'FOREX_MAJORS': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
    'FOREX_YEN': ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'],
    'INDICES_GOLD': ['SPX', 'NDX', 'XAUUSD', 'VIX'],
    'ASIAN_SESSION': ['USDJPY', 'AUDUSD', 'AUDJPY', 'NZDUSD', 'N225'],
    'LONDON_SESSION': ['GBPUSD', 'EURUSD', 'EURGBP', 'GBPJPY', 'GDAXI'],
    'NY_SESSION': ['NDX', 'SPX', 'XAUUSD', 'USDCAD', 'BTCUSD', 'TSLA', 'NVDA']
};
