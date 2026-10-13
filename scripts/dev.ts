export {};
const children=[Bun.spawn([process.execPath,'--env-file=apps/api/.env','--watch','apps/api/src/server.ts'],{stdout:'inherit',stderr:'inherit'}),Bun.spawn([process.execPath,'x','--no-install','vite','--config','apps/web/vite.config.ts'],{stdout:'inherit',stderr:'inherit'})];
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{children.forEach(p=>p.kill());process.exit(0)});
const code=await Promise.race(children.map(p=>p.exited));children.forEach(p=>p.kill());process.exit(code||0);
