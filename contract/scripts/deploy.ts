import hre from "hardhat";

async function main() {
  const sealedRaid = await hre.viem.deployContract("SealedRaid");
  console.log(`SealedRaid deployed to ${sealedRaid.address} on ${hre.network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
