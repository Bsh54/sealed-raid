import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import { sealedRaidAbi } from "./abi.mjs";
const c = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const A="0x852a9463b4074157f80a8100b715bda8a056071b";
for(let i=0;i<3;i++){
  const f = await c.readContract({address:A,abi:sealedRaidAbi,functionName:"joinFee"});
  const bn = await c.getBlockNumber();
  const blk = await c.getBlock({blockNumber:bn});
  console.log("block",bn.toString(),"basefee",(blk.baseFeePerGas||0n).toString(),"joinFee",f.toString(),"=",formatEther(f),"ETH");
  await new Promise(r=>setTimeout(r,4000));
}
