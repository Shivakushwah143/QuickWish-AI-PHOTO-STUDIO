import sharp from 'sharp';
import {v2 as cloudinary} from 'cloudinary';
import {mkdir,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {env} from './config';
import {assert} from './security';
cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
export {cloudinary};
export async function validatedImage(file:File){
 assert(file instanceof File&&file.size>0&&file.size<=8*1024*1024,400,'Choose a JPEG, PNG or WebP image up to 8 MB.');
 assert(/\.(jpe?g|png|webp)$/i.test(file.name),400,'Unsupported file extension.');
 const raw=Buffer.from(await file.arrayBuffer());
 let meta;try{meta=await sharp(raw,{limitInputPixels:24000000,animated:false}).metadata()}catch{assert(false,400,'This image could not be decoded.');}
 assert(meta&&['jpeg','png','webp'].includes(meta.format||'')&&(meta.pages||1)===1&&meta.width!>=128&&meta.height!>=128&&meta.width!<=8000&&meta.height!<=8000,400,'Use a non-animated JPEG, PNG or WebP, at least 128 × 128 and at most 24 megapixels.');
 // Re-encode to strip EXIF/GPS, trailing payloads and untrusted metadata.
 const {data,info}=await sharp(raw,{limitInputPixels:24000000}).rotate().webp({quality:95}).toBuffer({resolveWithObject:true});
 return {data,width:info.width,height:info.height,format:'webp',mime:'image/webp',bytes:data.length};
}
export async function storeImage(file:File,forceCloud=false){const im=await validatedImage(file);const id='quickwish/private/'+randomUUID();
 if(env.MODE==='LIVE'||forceCloud){const result:any=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({public_id:id,type:'authenticated',resource_type:'image',overwrite:false,timeout:45000},(err,r)=>err?reject(new Error('Cloud storage upload unavailable')):resolve(r));stream.end(im.data)});assert(result.type==='authenticated',502,'Storage protection could not be confirmed.');return {...im,data:undefined,storage_id:result.public_id,provider:'CLOUDINARY'};}
 await mkdir(env.PRIVATE_MEDIA_DIR,{recursive:true,mode:0o700});const key=randomUUID()+'.webp';await Bun.write(join(env.PRIVATE_MEDIA_DIR,key),im.data,{mode:0o600});return {...im,data:undefined,storage_id:key,provider:'LOCAL'};
}
export async function storePublicImage(file:File){const im=await validatedImage(file);const id='quickwish/public/'+randomUUID();
 if(env.MODE==='LIVE'){const result:any=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({public_id:id,type:'upload',resource_type:'image',overwrite:false,timeout:45000},(err,r)=>err?reject(new Error('Public image upload failed')):resolve(r));stream.end(im.data)});return {url:result.secure_url,storage_id:result.public_id,provider:'CLOUDINARY'};}
 await mkdir(env.PUBLIC_MEDIA_DIR,{recursive:true,mode:0o755});const key=randomUUID()+'.webp';await Bun.write(join(env.PUBLIC_MEDIA_DIR,key),im.data,{mode:0o644});return {url:'/uploads/'+key,storage_id:key,provider:'LOCAL'};
}
export async function deleteImage(asset:any){if(asset.provider==='CLOUDINARY'){const r=await cloudinary.uploader.destroy(asset.storage_id,{resource_type:'image',type:'authenticated',invalidate:true});assert(['ok','not found'].includes(r.result),502,'Storage deletion unavailable.')}else{assert(/^[a-f0-9-]+\.webp$/.test(asset.storage_id),400);await unlink(resolve(env.PRIVATE_MEDIA_DIR,asset.storage_id)).catch((e:any)=>{if(e.code!=='ENOENT')throw e})}}
export async function mediaResponse(asset:any,attachment=true){assert(asset&&!asset.deleted_at,404,'This media is unavailable.');let body:BodyInit;
 if(asset.provider==='CLOUDINARY'){const url=cloudinary.utils.private_download_url(asset.storage_id,asset.format,{type:'authenticated',resource_type:'image',expires_at:Math.floor(Date.now()/1000)+60,attachment:false});const r=await fetch(url,{signal:AbortSignal.timeout(20000)});assert(r.ok&&r.body,502,'Media delivery is temporarily unavailable.');body=r.body!;}else{assert(/^[a-f0-9-]+\.webp$/.test(asset.storage_id),404);const f=Bun.file(resolve(env.PRIVATE_MEDIA_DIR,asset.storage_id));assert(await f.exists(),404,'This media has expired.');body=f;}
 return new Response(body,{headers:{'Content-Type':asset.mime,'Cache-Control':'no-store','Content-Disposition':`${attachment?'attachment':'inline'}; filename="quickwish-photo.webp"`,'X-Content-Type-Options':'nosniff'}});
}
