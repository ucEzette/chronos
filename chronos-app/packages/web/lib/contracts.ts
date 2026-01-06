import { parseAbi } from "viem";

// 1. Define Contract Addresses for Each Chain
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  55931: (process.env.NEXT_PUBLIC_PAYLOCK_ADDRESS_DATAHAVEN as `0x${string}`) || "0x...", // DataHaven
  5042002: (process.env.NEXT_PUBLIC_PAYLOCK_ADDRESS_ARC as `0x${string}`) || "0x...",     // Arc Testnet
};

// 2. Helper to get the correct address safely
// Defaults to DataHaven (55931) if chain is undefined
export const getContractAddress = (chainId?: number) => {
  return CONTRACT_ADDRESSES[chainId || 55931] || CONTRACT_ADDRESSES[55931];
};

// 3. Fallback export for legacy imports (Satisfies the 'has no exported member' error)
export const PAYLOCK_ADDRESS = getContractAddress(55931);

export const PAYLOCK_ABI = parseAbi([
  // Events
  "event ItemCanceled(uint256 indexed id, address indexed seller)",
  "event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply)",
  "event ItemPurchased(uint256 indexed id, address indexed buyer)",
  "event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey)",
  
  // Functions
  "function listItem(string _name, string _ipfsCid, string _previewCid, string _fileType, uint256 _price, uint256 _maxSupply) external",
  "function buyItem(uint256 _id) external payable",
  "function deliverKey(uint256 _id, address _buyer, string _keyForBuyer) external",
  "function cancelListing(uint256 _id) external",
  
  // FIX: Replaced 'tuple(...)' with '((...))' for the array of structs
  "function getMarketplaceItems() external view returns ((uint256 id, address seller, string name, string ipfsCid, string previewCid, string fileType, uint256 price, uint256 maxSupply, uint256 soldCount, bool isSoldOut)[])",
  
  "function checkOwnership(uint256 _id, address _user) external view returns (bool bought, string key)",
  "function owner() view returns (address)"
]);