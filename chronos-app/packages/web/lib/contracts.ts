// ==========================================
// 1. CHRONOS VAULT (Time Capsules & Void)
// ==========================================

export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS as `0x${string}`;

export const VAULT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_ipfsCid", "type": "string" },
      { "internalType": "bytes", "name": "_encryptedKey", "type": "bytes" },
      { "internalType": "uint256", "name": "_unlockTime", "type": "uint256" }
    ],
    "name": "createCapsule",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "signalVoid",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "getCapsule",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "ipfsCid", "type": "string" },
          { "internalType": "bytes", "name": "encryptedKey", "type": "bytes" },
          { "internalType": "uint256", "name": "unlockTime", "type": "uint256" },
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "bool", "name": "isClaimed", "type": "bool" }
        ],
        "internalType": "struct ChronosVault.Capsule",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMyCapsules",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;


// ==========================================
// 2. PAYLOCK PROTOCOL (Data Vending)
// ==========================================

export const PAYLOCK_ADDRESS = process.env.NEXT_PUBLIC_PAYLOCK_ADDRESS as `0x${string}`;

export const PAYLOCK_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ItemListed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ItemPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "encryptedKey", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "KeyDelivered",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "buyItem",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" },
      { "internalType": "string", "name": "_keyForBuyer", "type": "string" }
    ],
    "name": "deliverKey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "getItem",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address payable", "name": "seller", "type": "address" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "ipfsCid", "type": "string" },
          { "internalType": "string", "name": "previewCid", "type": "string" },
          { "internalType": "string", "name": "fileType", "type": "string" },
          { "internalType": "uint256", "name": "price", "type": "uint256" },
          { "internalType": "address", "name": "buyer", "type": "address" },
          { "internalType": "string", "name": "encryptedKey", "type": "string" },
          { "internalType": "bool", "name": "isSold", "type": "bool" },
          { "internalType": "bool", "name": "isKeyDelivered", "type": "bool" },
          { "internalType": "uint256", "name": "listedAt", "type": "uint256" },
          { "internalType": "uint256", "name": "soldAt", "type": "uint256" }
        ],
        "internalType": "struct PayLock.Item",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMarketplaceItems",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address payable", "name": "seller", "type": "address" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "ipfsCid", "type": "string" },
          { "internalType": "string", "name": "previewCid", "type": "string" },
          { "internalType": "string", "name": "fileType", "type": "string" },
          { "internalType": "uint256", "name": "price", "type": "uint256" },
          { "internalType": "address", "name": "buyer", "type": "address" },
          { "internalType": "string", "name": "encryptedKey", "type": "string" },
          { "internalType": "bool", "name": "isSold", "type": "bool" },
          { "internalType": "bool", "name": "isKeyDelivered", "type": "bool" },
          { "internalType": "uint256", "name": "listedAt", "type": "uint256" },
          { "internalType": "uint256", "name": "soldAt", "type": "uint256" }
        ],
        "internalType": "struct PayLock.Item[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_ipfsCid", "type": "string" },
      { "internalType": "string", "name": "_previewCid", "type": "string" },
      { "internalType": "string", "name": "_fileType", "type": "string" },
      { "internalType": "uint256", "name": "_price", "type": "uint256" }
    ],
    "name": "listItem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;