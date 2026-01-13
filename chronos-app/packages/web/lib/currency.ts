// Currency helpers for different networks

// Chain IDs
export const DATAHAVEN_CHAIN_ID = 55931;
export const ARC_CHAIN_ID = 5042002;
export const ARB_SEPOLIA_CHAIN_ID = 421614;

// Get currency symbol based on chain ID
export function getCurrencySymbol(chainId: number | undefined): string {
    if (chainId === ARC_CHAIN_ID) {
        return 'USDC';
    }
    if (chainId === ARB_SEPOLIA_CHAIN_ID) {
        return 'ETH';
    }
    return 'MOCK';
}

// Get full currency name
export function getCurrencyName(chainId: number | undefined): string {
    if (chainId === ARC_CHAIN_ID) {
        return 'USDC';
    }
    if (chainId === ARB_SEPOLIA_CHAIN_ID) {
        return 'Ethereum';
    }
    return 'MOCK Token';
}

// Get chain name
export function getChainName(chainId: number | undefined): string {
    if (chainId === ARC_CHAIN_ID) {
        return 'Arc Testnet';
    }
    if (chainId === ARB_SEPOLIA_CHAIN_ID) {
        return 'Arbitrum Sepolia';
    }
    if (chainId === DATAHAVEN_CHAIN_ID) {
        return 'DataHaven Testnet';
    }
    return 'Unknown Network';
}

// Format price with currency symbol
export function formatPriceWithCurrency(price: string | number, chainId: number | undefined): string {
    const symbol = getCurrencySymbol(chainId);
    return `${price} ${symbol}`;
}
