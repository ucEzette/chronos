import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    datahaven: {
      url: "https://services.datahaven-testnet.network/testnet",
      chainId: 55931,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    arc_testnet: {
      url: "https://rpc.testnet.arc.network", // Verified RPC
      chainId: 5042002, // Verified Chain ID
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      datahaven: "test",
      arc_testnet: "test",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "datahaven",
        chainId: 55931,
        urls: {
          apiURL: "https://testnet.dhscan.io/api",
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