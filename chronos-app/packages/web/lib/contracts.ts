import { parseAbi } from "viem";

// 1. Define Contract Addresses for Each Chain
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  // DataHaven Testnet
  55931: (process.env.NEXT_PUBLIC_PAYLOCK_ADDRESS_DATAHAVEN as `0x${string}`) || "0x9d660A95fbe0DA15f579f5c122961f6b5D813339", 
  
  // Arc Testnet
  5042002: (process.env.NEXT_PUBLIC_PAYLOCK_ADDRESS_ARC as `0x${string}`) || "0xA6EE007309798c3cBEA7e317dec49f8EC76A151A",     
};

// 2. Helper to get the correct address safely
export const getContractAddress = (chainId?: number) => {
  return CONTRACT_ADDRESSES[chainId || 55931] || CONTRACT_ADDRESSES[55931];
};

// 3. Fallback export
export const PAYLOCK_ADDRESS = getContractAddress(55931);

export const PAYLOCK_ABI = parseAbi([
  // Events
  "event ItemCanceled(uint256 indexed id, address indexed seller)",
  "event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply)",
  "event ItemPurchased(uint256 indexed id, address indexed buyer)",
  "event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey)",
  "event FeeUpdated(uint256 newFee)",
  "event FeesWithdrawn(address indexed owner, uint256 amount)",

  // User Functions
  "function listItem(string _name, string _ipfsCid, string _previewCid, string _fileType, uint256 _price, uint256 _maxSupply) external",
  "function buyItem(uint256 _id) external payable",
  "function deliverKey(uint256 _id, address _buyer, string _keyForBuyer) external",
  "function cancelListing(uint256 _id) external",
  
  // Admin Functions
  "function setFee(uint256 _newFee) external",
  "function withdrawFees() external",
  
  // View Functions
  "function getMarketplaceItems() external view returns ((uint256 id, address seller, string name, string ipfsCid, string previewCid, string fileType, uint256 price, uint256 maxSupply, uint256 soldCount, bool isSoldOut, bool isActive)[])",
  "function checkOwnership(uint256 _id, address _user) external view returns (bool bought, string key)",
  "function owner() view returns (address)",
  "function serviceFeePercentage() view returns (uint256)",
  "function accumulatedFees() view returns (uint256)"
]);