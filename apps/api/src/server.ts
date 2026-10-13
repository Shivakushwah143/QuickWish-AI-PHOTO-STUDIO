import app from './app';
import {env,validateStartup} from './config';
import {sql} from '../../../packages/db/connection';
import {resolve} from 'node:path';
validateStartup();
const root=resolve('apps/web/dist');
const server=Bun.serve({hostname:'127.0.0.1',port:env.PORT,maxRequestBodySize:9*1024*1024,async fetch(req,server){const path=new URL(req.url).pathname;if(path.startsWith('/api/')||['/healthz','/readyz'].includes(path))return app.fetch(req,{ip:server.requestIP(req)?.address||'unknown'});let decoded:string;try{decoded=decodeURIComponent(path)}catch{return new Response('Invalid URL',{status:400})}const safe=resolve(root,'.'+decoded);if(!safe.startsWith(root+'/')&&safe!==root)return new Response('Not found',{status:404});let file=Bun.file(safe===root?root+'/index.html':safe);if(!await file.exists())file=Bun.file(root+'/index.html');return new Response(file,{headers:{'Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'X-Frame-Options':'DENY'}})}});
console.log(JSON.stringify({event:'server_started',port:server.port,mode:env.MODE}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.stop();await sql.end();process.exit(0)});
