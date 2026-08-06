import { createPublicClient, createWalletClient, http, parseEther, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { sealedRaidAbi } from "./abi.mjs";
const RPC="https://sepolia.base.org", A=process.env.CONTRACT_ADDRESS;
const host=privateKeyToAccount(process.env.PLAYER_KEY);
const guest=privateKeyToAccount(process.env.BOT_KEY);
const pc=createPublicClient({chain:baseSepolia,transport:http(RPC)});
const hw=createWalletClient({account:host,chain:baseSepolia,transport:http(RPC)});
const gw=createWalletClient({account:guest,chain:baseSepolia,transport:http(RPC)});
const C={address:A,abi:sealedRaidAbi};
// create fresh match
const h=await hw.writeContract({...C,functionName:"createMatch",args:[false],value:parseEther("0.001")});
const r=await pc.waitForTransactionReceipt({hash:h});
let id=null; for(const l of r.logs){try{const ev=decodeEventLog({abi:sealedRaidAbi,data:l.data,topics:l.topics});if(ev.eventName==="MatchCreated"){id=ev.args.id;break;}}catch{}}
console.log("created match",id,"stake",(await pc.readContract({...C,functionName:"getMatch",args:[id]}))[2].toString());
// simulate join with 0.004
try{
  const {request}=await pc.simulateContract({...C,functionName:"joinMatch",args:[id],value:parseEther("0.004"),account:guest.address});
  console.log("SIM PASS, sending real...");
  const jh=await gw.writeContract(request);
  const jr=await pc.waitForTransactionReceipt({hash:jh});
  console.log("JOIN status:",jr.status);
  const m=await pc.readContract({...C,functionName:"getMatch",args:[id]});
  console.log("phase after join:",m[3]);
}catch(e){
  console.log("JOIN FAILED:",(e.shortMessage||e.message).split("\n")[0]);
  if(e.metaMessages)console.log(e.metaMessages.slice(0,4).join(" | "));
}
