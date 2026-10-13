export const base='/api/v1';
export async function api(path:string,options:RequestInit={}){const headers=new Headers(options.headers);if(options.body&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');const r=await fetch(base+path,{...options,headers,credentials:'same-origin'});if(!r.ok){const e=await r.json().catch(()=>({message:'The service is unavailable.'}));throw new Error(e.message||'Request failed.')}return r.json();}
export const post=(path:string,data:unknown={},key?:string)=>api(path,{method:'POST',body:JSON.stringify(data),headers:key?{'Idempotency-Key':key}:{}});
export const upload=(path:string,file:File,fields:Record<string,string>={})=>{const data=new FormData();data.set('file',file);Object.entries(fields).forEach(([k,v])=>data.set(k,v));return api(path,{method:'POST',body:data})};
export const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n/100);
export const human=(v:string)=>v.toLowerCase().replaceAll('_',' ');
