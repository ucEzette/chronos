import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify"; // <--- IMPORT THIS

require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    datahaven: {
      url: "https://services.datahaven-testnet.network/testnet",
      chainId: 55931, // Your specific Chain ID
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  // ADD THIS SECTION
  etherscan: {
    apiKey: {
      datahaven: "test", // Blockscout usually accepts any string here
    },
    customChains: [
      {
        network: "datahaven",
        chainId: 55931,
        urls: {
          // IMPORTANT: Check if your explorer URL ends with /api or /api/v2
          apiURL: "https://testnet.dhscan.io/api/v2", 
          browserURL: "https://testnet.dhscan.io/",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

export default config;