// Lightweight test-only embedded PostgreSQL. Never used by the application runtime.
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temporary=await mkdtemp(join(tmpdir(),'quickwish-test-'));
const password=crypto.randomUUID();
const testEnv={...process.env,MODE:'DEMO',NODE_ENV:'test',DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:15439/postgres',DATABASE_DIRECT_URL:'',DB_POOL_MAX:'1',PORT:'13001',API_TEST_URL:'http://127.0.0.1:13001',PUBLIC_APP_URL:'http://localhost:5173',ADMIN_PASSWORD_HASH:await Bun.password.hash(password,{algorithm:'argon2id',memoryCost:19456,timeCost:2}),TEST_ADMIN_PASSWORD:password,PRIVATE_MEDIA_DIR:temporary,GROQ_API_KEY:'',CLOUDINARY_API_KEY:'',CLOUDINARY_API_SECRET:''};
const db=await PGlite.create();const pg=new PGLiteSocketServer({db,host:'127.0.0.1',port:15439,maxConnections:10});let server:ReturnType<typeof Bun.spawn>|undefined;
try{
 await db.exec('CREATE SCHEMA quickwish; SET search_path TO quickwish,public;');
 await db.exec(await Bun.file('packages/db/migrations/0001_initial.sql').text());
 await db.exec("INSERT INTO packages(code,name,amount,quantity) VALUES('SINGLE','single',4900,1),('TRIO','trio',9900,3),('FIVE','five',14900,5); INSERT INTO styles(slug,title,category,description,image_url) VALUES('test-style','Test style','Test','Synthetic local API test reference','/art/editorial.svg');");
 await pg.start();
 server=Bun.spawn([process.execPath,'apps/api/src/server.ts'],{env:testEnv,stdout:'inherit',stderr:'inherit'});
 let ready=false;for(let i=0;i<30;i++){try{const r=await fetch(testEnv.API_TEST_URL+'/healthz');if(r.ok){ready=true;break}}catch{}await Bun.sleep(100)}if(!ready)throw new Error('Test API did not start');
 const t=Bun.spawn([process.execPath,'test','tests/integration.test.ts'],{env:testEnv,stdout:'inherit',stderr:'inherit'});process.exitCode=await t.exited;
}finally{if(server){server.kill();await server.exited;}await pg.stop();await db.close();await rm(temporary,{recursive:true,force:true});}
