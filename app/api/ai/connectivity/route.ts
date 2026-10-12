import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { Agent } from "undici";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
export const maxDuration = 90;
export const preferredRegion = "hnd1";

export async function GET() {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();
  if (session.email !== "reuse-a-1791800559083@example.com") return NextResponse.json({error:"Not found"},{status:404});
  const url = new URL(process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com");
  url.pathname = "/api/v1/services/aigc/image-generation/generation";
  const addresses = await lookup(url.hostname, { all: true });
  const probes = addresses.filter(item=>item.family===4).slice(0,4).map(async item => {
    const start=Date.now();
    return new Promise(resolve => {
      let phase="connect";
      const req=https.request(url,{method:"GET",family:4,lookup:(_host,_options,callback)=>callback(null,item.address,4)},response=>{
        response.resume();resolve({address:item.address,status:response.statusCode,phase:"response",ms:Date.now()-start});
      });
      req.on("socket",socket=>{socket.on("connect",()=>{phase="tls";});socket.on("secureConnect",()=>{phase="http";});});
      req.setTimeout(18000,()=>req.destroy(new Error("probe timeout")));
      const timer=setTimeout(()=>req.destroy(new Error("probe deadline")),20000);
      req.on("close",()=>clearTimeout(timer));
      req.on("error",error=>resolve({address:item.address,phase,ms:Date.now()-start,error:error.message}));req.end();
    });
  });
  const agent=new Agent({connect:{timeout:18000},autoSelectFamily:true,autoSelectFamilyAttemptTimeout:300});
  async function probe(dispatcher?: Agent){const start=Date.now();try{const r=await fetch(url,{...(dispatcher?{dispatcher}:{}),signal:AbortSignal.timeout(20000),cache:"no-store"});await r.body?.cancel();return {status:r.status,ms:Date.now()-start};}catch(e){return {ms:Date.now()-start,code:e instanceof Error&&e.cause&&typeof e.cause==='object'&&'code'in e.cause?e.cause.code:undefined,error:e instanceof Error?e.name:"unknown"};}}
  const [native,custom,ipProbes]=await Promise.all([probe(),probe(agent),Promise.all(probes)]);
  await agent.close();
  const payload=JSON.stringify({model:"connectivity-probe-invalid-model",input:{messages:[]}});
  const headers={Authorization:"Bearer "+process.env.DASHSCOPE_API_KEY,"Content-Type":"application/json","X-DashScope-Async":"enable"};
  async function authenticatedProbe(useCustom:boolean){
    const started=Date.now();const dispatcher=useCustom?new Agent({connect:{timeout:18000},autoSelectFamily:true}):undefined;
    try {const response=await fetch(url,{method:"POST",headers,body:payload,...(dispatcher?{dispatcher}:{}),signal:AbortSignal.timeout(20000)});const body=await response.json();return {status:response.status,code:body.code,ms:Date.now()-started};}
    catch(error){const e=error as Error&{cause?:{code?:string;syscall?:string;address?:string;errors?:{code?:string;address?:string}[]}};return {ms:Date.now()-started,name:e.name,cause:e.cause?{code:e.cause.code,syscall:e.cause.syscall,address:e.cause.address,errors:e.cause.errors?.map(x=>({code:x.code,address:x.address}))}:undefined};}
    finally{if(dispatcher)await dispatcher.close();}
  }
  const [authenticatedNative,authenticatedCustom]=await Promise.all([authenticatedProbe(false),authenticatedProbe(true)]);
  return NextResponse.json({region:process.env.VERCEL_REGION,host:url.hostname,addresses,native,custom,ipProbes,authenticatedNative,authenticatedCustom});
}
