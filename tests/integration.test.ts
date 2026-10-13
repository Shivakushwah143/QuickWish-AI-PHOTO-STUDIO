// Opt-in real API workflow. Requires a RUNNING local DEMO instance and PostgreSQL.
// Creates synthetic records. Never run against a live merchant deployment.
import {test,expect} from 'bun:test';
import sharp from 'sharp';
const origin=process.env.PUBLIC_APP_URL||'http://localhost:5173';const host=process.env.API_TEST_URL||'http://127.0.0.1:3001';
function client(){const cookies=new Map<string,string>();return async(path:string,data?:any,options:RequestInit={})=>{const headers=new Headers(options.headers);headers.set('Origin',origin);headers.set('Cookie',[...cookies].map(([k,v])=>k+'='+v).join('; '));let body:BodyInit|undefined;if(data instanceof FormData)body=data;else if(data!==undefined){headers.set('Content-Type','application/json');body=JSON.stringify(data)}const r=await fetch(host+'/api/v1'+path,{...options,method:data===undefined?'GET':'POST',headers,body});for(const c of r.headers.getSetCookie()){const [kv]=c.split(';'),i=kv.indexOf('=');cookies.set(kv.slice(0,i),kv.slice(i+1))}return r}}
test('DEMO: claim → verify → QC → partial download → revoke',async()=>{
 const buyer=client(),owner=client(),stranger=client();const config=await(await buyer('/config/public')).json();expect(config.mode).toBe('DEMO');expect((await stranger('/admin/orders')).status).toBe(401);expect((await fetch(host+'/api/v1/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'not-a-real-password'})})).status).toBe(403);
 const password=process.env.TEST_ADMIN_PASSWORD||(await Bun.file('.private/demo-admin-password.txt').text()).trim();expect((await owner('/admin/login',{password})).status).toBe(200);
 const styles=await(await buyer('/styles')).json();expect(styles.length).toBeGreaterThan(0);
 const payload={styleId:styles[0].id,packageCode:'TRIO',phone:'+919876543210',consent:true,consentVersion:'2026-10-12-v1'};
 expect((await buyer('/orders',{...payload,consent:false},{headers:{'Idempotency-Key':crypto.randomUUID()}})).status).toBe(400);
 const r=await buyer('/orders',payload,{headers:{'Idempotency-Key':crypto.randomUUID()}});expect(r.status).toBe(201);const o=await r.json();
 expect((await stranger('/orders/'+o.code)).status).toBe(403);
 const bytes=await sharp({create:{width:256,height:256,channels:3,background:'#20564a'}}).png().toBuffer();const form=()=>{const f=new FormData();f.set('file',new File([new Uint8Array(bytes)],'fixture.png',{type:'image/png'}));f.set('kind','SOURCE');return f};
 expect((await buyer('/orders/'+o.code+'/uploads',form())).status).toBe(201);
 const claimResponse=await buyer('/orders/'+o.code+'/payment-claims',{utr:'DEMO123456',claimedPaise:9900},{headers:{'Idempotency-Key':crypto.randomUUID()}});expect(claimResponse.status).toBe(202);const claim=await claimResponse.json();let status=await(await buyer('/orders/'+o.code)).json();expect(status.payment).not.toBe('VERIFIED');
 expect((await buyer('/orders/'+o.code+'/slots/'+status.slots[0].id+'/download')).status).toBe(403);
 const orders=await(await owner('/admin/orders')).json();const order=orders.find((x:any)=>x.code===o.code);const ledger=await(await owner('/admin/orders/'+order.id+'/demo-credit',{})).json();
 const evidence={reference:ledger.reference,amount:9900,payee:ledger.payee,observedAt:new Date().toISOString(),note:'Read the independent DEMO ledger fixture.',independentCheck:true};
 expect((await owner('/admin/payment-claims/'+claim.id+'/verify',{...evidence,amount:4900})).status).toBe(409);
 expect((await owner('/admin/payment-claims/'+claim.id+'/verify',evidence)).status).toBe(200);
 expect((await owner('/admin/payment-claims/'+claim.id+'/verify',evidence)).status).toBe(200);
 expect((await owner('/admin/slots/'+status.slots[0].id+'/candidates',form())).status).toBe(201);
 const detail=await(await owner('/admin/orders/'+order.id)).json();const candidate=detail.candidates[0];
 expect((await buyer('/orders/'+o.code+'/slots/'+status.slots[0].id+'/download')).status).toBe(403);
 expect((await owner('/admin/candidates/'+candidate.id+'/review',{decision:'APPROVED',reason:'All quality checks passed.',checks:['likeness','skin','lighting','anatomy','style','artifacts','consent']})).status).toBe(200);
 expect((await buyer('/orders/'+o.code+'/slots/'+status.slots[0].id+'/download')).status).toBe(200);
 expect((await buyer('/orders/'+o.code+'/slots/'+status.slots[1].id+'/download')).status).toBe(403);
 expect((await stranger('/orders/'+o.code+'/slots/'+status.slots[0].id+'/download')).status).toBe(403);
 expect((await owner('/admin/orders/'+order.id+'/revoke',{reason:'Integration test revocation.'})).status).toBe(200);
 expect((await buyer('/orders/'+o.code+'/slots/'+status.slots[0].id+'/download')).status).toBe(403);
},60000);
