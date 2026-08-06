import { createPublicClient, createWalletClient, http, parseEther, formatEther, decodeEventLog, nonceManager } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { sealedRaidAbi } from "./abi.mjs";
const RPC="https://sepolia.base.org", A=process.env.CONTRACT_ADDRESS;
const host=privateKeyToAccount(process.env.PLAYER_KEY,{nonceManager});
const guest=privateKeyToAccount(process.env.BOT_KEY,{nonceManager});
const pc=createPublicClient({chain:baseSepolia,transport:http(RPC)});
const hw=createWalletClient({account:host,chain:baseSepolia,transport:http(RPC)});
const gw=createWalletClient({account:guest,chain:baseSepolia,transport:http(RPC)});
const C={address:A,abi:sealedRaidAbi};
const gbal0=await pc.getBalance({address:guest.address});
async function mk(){const h=await hw.writeContract({...C,functionName:"createMatch",args:[false],value:parseEther("0.001")});const r=await pc.waitForTransactionReceipt({hash:h});for(const l of r.logs){try{const ev=decodeEventLog({abi:sealedRaidAbi,data:l.data,topics:l.topics});if(ev.eventName==="MatchCreated")return ev.args.id;}catch{}}}
for(const buf of ["0.008","0.02","0.05"]){
  const id=await mk();
  const b0=await pc.getBalance({address:guest.address});
  try{
    const h=await gw.writeContract({...C,functionName:"joinMatch",args:[id],value:parseEther("0.001")+parseEther(buf)});
    const r=await pc.waitForTransactionReceipt({hash:h});
    const m=await pc.readContract({...C,functionName:"getMatch",args:[id]});
    const b1=await pc.getBalance({address:guest.address});
    const netCost=b0-b1;
    console.log(`buf ${buf}: status=${r.status} phase=${m[3]} netCost=${formatEther(netCost)}ETH gasUsed=${r.gasUsed}`);
    if(r.status==="success"&&Number(m[3])===1){console.log("=> WORKS. Real FHE cost ~",formatEther(netCost-parseEther("0.001")),"ETH (minus stake)");break;}
  }catch(e){console.log(`buf ${buf}: ${(e.shortMessage||e.message).split("\n")[0]}`);}
}
