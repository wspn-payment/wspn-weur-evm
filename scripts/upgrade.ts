import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = "YOUR_PROXY_ADDRESS_HERE";
  console.log("Upgrading ERC20F...");

  const ERC20F = await ethers.getContractFactory("ERC20F");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, ERC20F);

  await upgraded.waitForDeployment();
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("Upgrade complete");
  console.log("Proxy address:", proxyAddress);
  console.log("New implementation address:", newImplementationAddress);
  
  console.log("\nVerify New Implementation Contract:");
  console.log("npx hardhat verify --network sepolia", newImplementationAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 