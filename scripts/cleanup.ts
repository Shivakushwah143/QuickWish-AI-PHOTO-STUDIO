import {env} from '../apps/api/src/config';
import {sql} from '../packages/db/connection';
import {deleteImage} from '../apps/api/src/media';
import {audit} from '../apps/api/src/security';
// Run daily. Owner must approve TTL before enabling this job. Same retention applies
// to all private media; financial/audit data are retained separately.
if(env.POLICIES_APPROVED!=='true'){console.error('Approve retention policy before cleanup.');process.exit(1)}
const assets=await sql`SELECT * FROM order_assets WHERE deleted_at IS NULL AND created_at<now()-${env.RETENTION_DAYS}*interval '1 day' LIMIT 100`;
let removed=0,failed=0;
for(const a of assets){try{await deleteImage(a);await sql.begin(async tx=>{await tx`UPDATE order_assets SET deleted_at=now() WHERE id=${a.id}`;await audit(tx,a.order_id,'SYSTEM','MEDIA_DELETED',{assetId:a.id});});removed++}catch{failed++}}
await sql`DELETE FROM admin_sessions WHERE expires_at<now()`;await sql`DELETE FROM rate_limits WHERE expires_at<now()`;await sql`DELETE FROM customer_access_tokens WHERE expires_at<now()-interval '30 days'`;await sql`DELETE FROM wish_usage_events WHERE day<current_date-30`;
console.log(JSON.stringify({removed,failed}));await sql.end();if(failed)process.exitCode=1;
