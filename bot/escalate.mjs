import { createPublicClient, createWalletClient, http, parseEther, decodeEventLog, nonceManager } from "viem";
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
async function mkMatch(){
  const h=await hw.writeContract({...C,functionName:"createMatch",args:[false],value:parseEther("0.001")});
  const r=await pc.waitForTransactionReceipt({hash:h});
  for(const l of r.logs){try{const ev=decodeEventLog({abi:sealedRaidAbi,data:l.data,topics:l.topics});if(ev.eventName==="MatchCreated")return ev.args.id;}catch{}}
}
for(const buf of ["0.005","0.02","0.05","0.1"]){
  const id=await mkMatch();
  try{
    const h=await gw.writeContract({...C,functionName:"joinMatch",args:[id],value:parseEther("0.001")+parseEther(buf)});
    const r=await pc.waitForTransactionReceipt({hash:h});
    const m=await pc.readContract({...C,functionName:"getMatch",args:[id]});
    console.log(`buffer ${buf} => status ${r.status}, phase ${m[3]} ${r.status==="success"?"PASS":""}`);
    if(r.status==="success")break;
  }catch(e){console.log(`buffer ${buf} => ${(e.shortMessage||e.message).split("\n")[0]}`);}
}
