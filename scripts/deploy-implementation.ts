import { readFileSync } from 'fs';
import { Fireblocks, BasePath } from '@fireblocks/ts-sdk';
import { ethers } from 'ethers';

async function main() {
  console.log("Deploying ERC20F implementation...");

  // Setup Fireblocks SDK
  const apiKey = process.env.FIREBLOCKS_API_KEY;
  if (!apiKey) throw new Error("FIREBLOCKS_API_KEY not set");
  
  process.env.FIREBLOCKS_BASE_PATH = BasePath.US;
  process.env.FIREBLOCKS_API_KEY = apiKey;
  process.env.FIREBLOCKS_SECRET_KEY = readFileSync("./fireblocks_secret.key", "utf8");

  const fireblocks = new Fireblocks();

  try {
    // Get implementation artifact
    const implementationArtifact = await import('../artifacts/contracts/ERC20F.sol/ERC20F.json');
    
    console.log("Creating implementation deployment transaction...");
    const implTx = await fireblocks.transactions.createTransaction({
      transactionRequest: {
        operation: "CONTRACT_CALL",
        assetId: "BNB_BSC",
        source: {
          type: "VAULT_ACCOUNT",
          id: "98"
        },
        destination: {
          type: "ONE_TIME_ADDRESS",
          oneTimeAddress: {
            address: "0x0"
          }
        },
        amount: "0",
        note: "Deploy ERC20F Implementation",
        extraParameters: {
          contractCallData: implementationArtifact.bytecode
        }
      }
    });

    console.log("Implementation tx created:", implTx.data.id);

    // Wait for implementation address
    let implStatus = await fireblocks.transactions.getTransaction({
      txId: implTx.data.id || ''
    });

    while (implStatus.data.status !== "COMPLETED") {
      await new Promise(resolve => setTimeout(resolve, 5000));
      implStatus = await fireblocks.transactions.getTransaction({
        txId: implTx.data.id || ''
      });
      console.log("Implementation transaction status:", implStatus.data.status);
    }

    console.log("Implementation deployment details:", implStatus.data);
    console.log("Implementation address:", implStatus.data.destinationAddress);

  } catch (error) {
    console.error("Implementation deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 