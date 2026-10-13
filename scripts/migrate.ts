import postgres from 'postgres';
import {readdir} from 'node:fs/promises';
const connection=process.env.DATABASE_DIRECT_URL||process.env.DATABASE_URL;
if(!connection){console.error('DATABASE_URL is required.');process.exit(1)}
const sql=postgres(connection,{max:1,connect_timeout:10,prepare:false,onnotice:()=>{}});
try{
 await sql.begin(async tx=>{
  await tx`SELECT pg_advisory_xact_lock(712500)`;
  await tx`CREATE SCHEMA IF NOT EXISTS quickwish`;
  await tx`SET LOCAL search_path TO quickwish, public`;
  await tx`CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`;
  for(const name of (await readdir('packages/db/migrations')).filter(x=>x.endsWith('.sql')).sort()){
   const content=await Bun.file('packages/db/migrations/'+name).text();const checksum=new Bun.CryptoHasher('sha256').update(content).digest('hex');const [prior]=await tx`SELECT checksum FROM schema_migrations WHERE name=${name}`;
   if(prior){if(prior.checksum!==checksum)throw new Error('Migration checksum changed');continue}
   await tx.unsafe(content);await tx`INSERT INTO schema_migrations(name,checksum) VALUES(${name},${checksum})`;console.log('Applied '+name);
  }
 });
 console.log('Migration successful (quickwish schema).');
}catch{console.error('Migration failed. Verify database access and migration checksum; no credentials printed.');process.exitCode=1}finally{await sql.end()}
