import {env,validateStartup} from '../apps/api/src/config';
import {sql} from '../packages/db/connection';
let failed=false;
console.log('Bun '+Bun.version);
try{validateStartup();console.log('PASS startup configuration')}catch(e:any){failed=true;console.log('BLOCKED '+e.message)}
try{await sql`SELECT 1 FROM quickwish.schema_migrations LIMIT 1`;console.log('PASS database and migrations')}catch{failed=true;console.log('BLOCKED database unavailable or migrations missing')}
console.log('Mode: '+env.MODE+'; no credentials printed.');await sql.end();process.exitCode=failed?1:0;
