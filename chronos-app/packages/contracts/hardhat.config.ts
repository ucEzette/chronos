import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // <--- CRITICAL FIX: Resolves "Stack too deep" error
    },
  },
  networks: {
    datahavenTestnet: {
      url: process.env.DATAHAVEN_RPC_URL || "https://services.datahaven-testnet.network/testnet",
      chainId: 55931,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    }
  }
};

export default config;