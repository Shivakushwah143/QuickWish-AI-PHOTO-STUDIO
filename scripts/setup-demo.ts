import {mkdir,chmod} from 'node:fs/promises';
const path='apps/api/.env';
if(await Bun.file(path).exists()){console.error('Existing backend .env preserved. Use db:migrate and db:seed, or move your .env aside before setting up DEMO.');process.exit(1)}
const password=crypto.randomUUID()+'!';const hash=await Bun.password.hash(password,{algorithm:'argon2id',memoryCost:65536,timeCost:3});const text=(await Bun.file('apps/api/.env.example').text()).replace('ADMIN_PASSWORD_HASH=','ADMIN_PASSWORD_HASH='+JSON.stringify(hash));await Bun.write(path,text);await chmod(path,0o600);await mkdir('.private',{recursive:true,mode:0o700});await Bun.write('.private/demo-admin-password.txt',password+'\n',{mode:0o600});console.log('Demo config created. Read .private/demo-admin-password.txt locally for your generated password.');
const docker=Bun.spawn(['docker','compose','up','-d','--wait','db'],{stdout:'inherit',stderr:'inherit'});if(await docker.exited){console.error('Start PostgreSQL with Docker Desktop, then run db:migrate and db:seed.');process.exit(1)}
for(const script of ['db:migrate','db:seed']){const p=Bun.spawn([process.execPath,'run',script],{stdout:'inherit',stderr:'inherit'});if(await p.exited)process.exit(1)}
console.log('Ready: bun run dev → http://localhost:5173; admin at /admin. DEMO never creates a real payable QR.');
