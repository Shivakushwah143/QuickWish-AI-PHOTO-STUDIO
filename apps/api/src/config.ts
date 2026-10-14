import {z} from 'zod';
import {isValidUpiVpa} from '../../../packages/shared/contracts';
export const env=z.object({MODE:z.enum(['DEMO','LIVE']).default('DEMO'),NODE_ENV:z.enum(['development','production','test']).default('development'),PORT:z.coerce.number().int().default(3001),PUBLIC_APP_URL:z.url().default('http://localhost:5173'),DATABASE_URL:z.string().min(1),ADMIN_PASSWORD_HASH:z.string().default(''),CLOUDINARY_CLOUD_NAME:z.string().default(''),CLOUDINARY_API_KEY:z.string().default(''),CLOUDINARY_API_SECRET:z.string().default(''),GROQ_API_KEY:z.string().default(''),GROQ_MODEL:z.string().default('openai/gpt-oss-20b'),UPI_MERCHANT_VPA:z.string().default(''),UPI_MERCHANT_NAME:z.string().default(''),SUPPORT_WHATSAPP_E164:z.string().default(''),POLICIES_APPROVED:z.string().default('false'),REVIEW_HOURS:z.string().default('Contact the studio for availability'),DELIVERY_POLICY:z.string().default('Delivery time is confirmed by the studio after review.'),REFUND_POLICY:z.string().default('Contact the studio to request review; refunds are manually reconciled.'),REVISION_POLICY:z.string().default('Contact the studio for a correction review.'),RETENTION_DAYS:z.coerce.number().int().min(1).max(365).default(30),GUEST_DAYS:z.coerce.number().int().min(1).max(30).default(14),PRIVATE_MEDIA_DIR:z.string().default('.private/media'),PUBLIC_MEDIA_DIR:z.string().default('apps/web/public/uploads')}).parse(process.env);
export function validateStartup(){
 if(!env.ADMIN_PASSWORD_HASH.startsWith('$argon2id$'))throw new Error('Run bun run admin:password to configure an Argon2id hash.');
 if(env.MODE==='DEMO'&&env.NODE_ENV==='production')throw new Error('DEMO cannot run in production.');
 if(env.MODE==='LIVE'){
  for(const k of ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','GROQ_API_KEY','UPI_MERCHANT_VPA','UPI_MERCHANT_NAME','SUPPORT_WHATSAPP_E164'] as const)if(!env[k])throw new Error('Missing LIVE configuration: '+k);
  if(!isValidUpiVpa(env.UPI_MERCHANT_VPA))throw new Error('Configure a real merchant VPA.');
  if(!/^\+?[1-9]\d{9,14}$/.test(env.SUPPORT_WHATSAPP_E164))throw new Error('Configure support number.');
  if(env.POLICIES_APPROVED!=='true')throw new Error('Owner must approve commercial/privacy policies before LIVE checkout.');
  if(!env.DATABASE_URL.includes('sslmode=require'))throw new Error('LIVE database requires TLS.');
 }
 if(env.NODE_ENV==='production'&&!env.PUBLIC_APP_URL.startsWith('https://'))throw new Error('Production requires HTTPS.');
}
export function publicConfig(){return {mode:env.MODE,reviewHours:env.REVIEW_HOURS,deliveryPolicy:env.DELIVERY_POLICY,refundPolicy:env.REFUND_POLICY,revisionPolicy:env.REVISION_POLICY,retentionDays:env.RETENTION_DAYS,guestDays:env.GUEST_DAYS,policiesApproved:env.POLICIES_APPROVED==='true',whatsapp:env.SUPPORT_WHATSAPP_E164?'https://wa.me/'+env.SUPPORT_WHATSAPP_E164.replace('+',''):null}}
