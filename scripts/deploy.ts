import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("Deploying ERC20F...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get the contract factory
  const ERC20F = await ethers.getContractFactory("ERC20F");

  // Deploy the proxy
  const token = await upgrades.deployProxy(
    ERC20F,
    [
      "Test Token",           // name
      "TEST",                 // symbol
      deployer.address,      // defaultAdmin
      deployer.address,      // minter
      deployer.address,      // pauser
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await token.waitForDeployment();
  const proxyAddress = await token.getAddress();

  console.log("ERC20F proxy deployed to:", proxyAddress);

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Implementation address:", implementationAddress);

  console.log("\nVerify Proxy Contract:");
  console.log("npx hardhat verify --network sepolia", proxyAddress);
  
  console.log("\nVerify Implementation Contract:");
  console.log("npx hardhat verify --network sepolia", implementationAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 