import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    // 1. DataHaven Testnet
    datahaven: {
      url: "https://services.datahaven-testnet.network/testnet",
      chainId: 55931,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // 2. Arc Testnet (Added)
    arc_testnet: {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      datahaven: "test", 
      arc_testnet: "test", // Blockscout-based explorers often accept 'test' or empty string
    },
    customChains: [
      {
        network: "datahaven",
        chainId: 55931,
        urls: {
          apiURL: "https://testnet.dhscan.io/api/v2", 
          browserURL: "https://testnet.dhscan.io/",
        },
      },
      {
        network: "arc_testnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api", 
          browserURL: "https://testnet.arcscan.app/",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

export default config;