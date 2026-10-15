import {readdir} from 'node:fs/promises';
import {basename,extname,resolve} from 'node:path';

export const GARBA_CATEGORY_SLUG='garba-festive';
export const GARBA_IMAGE_DIRECTORY=resolve('apps/web/public/images/styles/garba');

export type GarbaStyleImport={slug:string;title:string;description:string;imageUrl:string};

export function garbaStyleManifest(fileNames:string[]):GarbaStyleImport[]{
 return fileNames
  .filter(file=>['.jpg','.jpeg','.png','.webp'].includes(extname(file).toLowerCase()))
  .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
  .map((file,index)=>{
   const stem=basename(file,extname(file)).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   return {
    slug:`garba-festive-${stem}`,
    title:`Garba Festive Look ${String(index+1).padStart(2,'0')}`,
    description:'A Garba and festive reference look available for a personalized, human-reviewed AI portrait.',
    imageUrl:`/images/styles/garba/${encodeURIComponent(file)}`
   };
  });
}

export async function importGarbaManifest(
 manifest:GarbaStyleImport[],
 insert:(style:GarbaStyleImport)=>Promise<boolean>
){
 let inserted=0;
 for(const style of manifest)if(await insert(style))inserted++;
 return {found:manifest.length,inserted,existing:manifest.length-inserted};
}

if(import.meta.main){
 const {sql}=await import('../packages/db/connection');
 try{
  const manifest=garbaStyleManifest(await readdir(GARBA_IMAGE_DIRECTORY));
  if(!manifest.length)throw new Error('No supported Garba images were found.');
  const [category]=await sql`SELECT id,name FROM service_categories WHERE slug=${GARBA_CATEGORY_SLUG}`;
  if(!category)throw new Error('The Garba & Festive category is missing. Apply existing migrations and seed it first.');
  const result=await importGarbaManifest(manifest,async style=>{
   const rows=await sql`INSERT INTO styles(slug,title,category,category_id,description,image_url,published)
    VALUES(${style.slug},${style.title},${category.name},${category.id},${style.description},${style.imageUrl},false)
    ON CONFLICT(slug) DO NOTHING RETURNING id`;
   return rows.length===1;
  });
  console.log(`Garba import complete: ${result.found} images, ${result.inserted} drafts added, ${result.existing} already present.`);
 }catch(error){
  console.error(error instanceof Error?error.message:'Garba import failed.');
  process.exitCode=1;
 }finally{await sql.end()}
}
