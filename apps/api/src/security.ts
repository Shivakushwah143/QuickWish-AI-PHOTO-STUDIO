import {createHash,randomBytes} from 'node:crypto';
import {getCookie,setCookie} from 'hono/cookie';
import type {Context} from 'hono';
import {sql} from '../../../packages/db/connection';
import {env} from './config';
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const secret=()=>randomBytes(32).toString('base64url');
export class ApiError extends Error{constructor(public status:number,public code:string,message:string){super(message)}}
export function assert(ok:unknown,status=409,message='This action is not available in the current state.'):asserts ok{if(!ok)throw new ApiError(status,status===403?'FORBIDDEN':'ACTION_BLOCKED',message)}
export async function limit(bucket:string,max:number,seconds:number){
 const [r]=await sql`INSERT INTO rate_limits(bucket,hits,expires_at) VALUES(${digest(bucket)},1,now()+${seconds}*interval '1 second') ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END,expires_at=CASE WHEN rate_limits.expires_at<now() THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING hits`;
 if(r.hits>max)throw new ApiError(429,'RATE_LIMIT','Too many attempts. Please try again later.');
}
export function cookie(c:Context,name:string,token:string,maxAge:number){setCookie(c,name,token,{httpOnly:true,secure:new URL(env.PUBLIC_APP_URL).protocol==='https:',sameSite:'Strict',path:'/api/v1',maxAge})}
export async function admin(c:Context){const v=getCookie(c,'qw_admin')||'';const [s]=await sql`UPDATE admin_sessions SET last_seen_at=now() WHERE session_hash=${digest(v)} AND password_version=${digest(env.ADMIN_PASSWORD_HASH)} AND expires_at>now() AND last_seen_at>now()-interval '30 minutes' RETURNING id`;assert(s,401,'Please unlock the studio.');return s}
export async function guest(c:Context,code:string){const v=getCookie(c,'qw_guest_'+code)||'';const [o]=await sql`SELECT o.* FROM orders o JOIN customer_access_tokens t ON t.order_id=o.id WHERE o.code=${code} AND t.token_hash=${digest(v)} AND t.kind='SESSION' AND t.revoked_at IS NULL AND t.expires_at>now()`;assert(o,403,'Private access is unavailable. Open your saved link or contact support.');return o}
export async function issueGuest(c:Context,orderId:string,code:string,expires?:Date){const token=secret();const expiry=expires||new Date(Date.now()+env.GUEST_DAYS*86400000);await sql`INSERT INTO customer_access_tokens(order_id,token_hash,kind,expires_at) VALUES(${orderId},${digest(token)},'SESSION',${expiry.toISOString()})`;cookie(c,'qw_guest_'+code,token,Math.max(0,Math.floor((expiry.getTime()-Date.now())/1000)))}
export async function audit(tx:any,orderId:string|null,actor:string,action:string,detail:object={}){await tx`INSERT INTO audit_events(order_id,actor,action,detail) VALUES(${orderId},${actor},${action},${JSON.stringify(detail)}::jsonb)`}
