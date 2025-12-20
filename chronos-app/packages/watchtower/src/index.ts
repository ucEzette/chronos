import { createPublicClient, http, parseAbiItem } from 'viem';
import 'dotenv/config';
import { sendProofEmail } from './mailer';

// Define the DataHaven chain (Must match config.ts)
const dataHavenChain = {
  id: 6969,
  name: 'DataHaven Testnet',
  nativeCurrency: { name: 'HAVE', symbol: 'HAVE', decimals: 18 },
  rpcUrls: { default: { http: [process.env.DATAHAVEN_RPC_URL!] } },
} as const;

const client = createPublicClient({
  chain: dataHavenChain,
  transport: http(),
});

async function main() {
  console.log("👁️ Watchtower Service Started...");

  // Event: VoidSignal(uint256 indexed fileId, address indexed user, uint256 timestamp)
  client.watchEvent({
    address: process.env.VAULT_CONTRACT_ADDRESS as `0x${string}`,
    event: parseAbiItem('event VoidSignal(uint256 indexed fileId, address indexed user, uint256 timestamp)'),
    onLogs: async (logs) => {
      for (const log of logs) {
        const { fileId, user } = log.args;
        const txHash = log.transactionHash;

        console.log(`[VOID DETECTED] File: ${fileId} | User: ${user}`);
        
        // In production: Look up user email from a database using 'user' address
        const mockEmail = "user@example.com"; 
        
        try {
          await sendProofEmail(mockEmail, fileId?.toString() || "Unknown", txHash);
          console.log(`[EMAIL SENT] Proof delivered to ${mockEmail}`);
        } catch (error) {
          console.error("[EMAIL ERROR]", error);
        }
      }
    },
  });
}

main().catch(console.error);