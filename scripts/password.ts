// Interactive password never enters shell history or application logs.
import {chmod} from 'node:fs/promises';
const file='apps/api/.env';
if(!await Bun.file(file).exists()){console.error('Create apps/api/.env from apps/api/.env.example first.');process.exit(1)}
if(!process.stdin.isTTY){console.error('Run this command interactively in your terminal.');process.exit(1)}
process.stdout.write('New admin password (16+ characters; hidden): ');
process.stdin.setRawMode(true);process.stdin.resume();let value='';
const password=await new Promise<string>(resolve=>{process.stdin.on('data',(b:Buffer)=>{for(const ch of b.toString()){if(ch==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(ch==='\r'||ch==='\n'){process.stdin.setRawMode(false);process.stdin.pause();resolve(value);return}if(ch==='\u007f')value=value.slice(0,-1);else value+=ch}})});
process.stdout.write('\n');if(password.length<16){console.error('Use at least 16 characters.');process.exit(1)}
const hash=await Bun.password.hash(password,{algorithm:'argon2id',memoryCost:65536,timeCost:3});let text=await Bun.file(file).text();text=text.replace(/^ADMIN_PASSWORD_HASH=.*$/m,'ADMIN_PASSWORD_HASH='+JSON.stringify(hash));await Bun.write(file,text);await chmod(file,0o600);console.log('Admin hash saved. Previous sessions are invalidated by password version.');
