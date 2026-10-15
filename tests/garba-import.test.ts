import {expect,test} from 'bun:test';
import {readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {GARBA_IMAGE_DIRECTORY,garbaStyleManifest,importGarbaManifest} from '../scripts/import-garba-styles';

test('Garba manifest includes every image with unique stable slugs',async()=>{
 const files=await readdir(GARBA_IMAGE_DIRECTORY);
 const manifest=garbaStyleManifest(files);
 const supported=files.filter(file=>/\.(jpe?g|png|webp)$/i.test(file));
 expect(manifest).toHaveLength(supported.length);
 expect(manifest).toHaveLength(20);
 expect(new Set(manifest.map(style=>style.slug)).size).toBe(manifest.length);
 expect(manifest.every(style=>style.imageUrl.startsWith('/images/styles/garba/'))).toBe(true);
});

test('Garba import is idempotent and leaves entries as drafts',async()=>{
 const manifest=garbaStyleManifest(await readdir(GARBA_IMAGE_DIRECTORY));
 const db=new PGlite();
 try{
  await db.exec(await Bun.file('packages/db/migrations/0001_initial.sql').text());
  await db.exec(await Bun.file('packages/db/migrations/0002_service_categories.sql').text());
  const category=(await db.query<any>("SELECT id,name FROM service_categories WHERE slug='garba-festive'")).rows[0];
  const insert=async(style:(typeof manifest)[number])=>(await db.query(
   'INSERT INTO styles(slug,title,category,category_id,description,image_url,published) VALUES($1,$2,$3,$4,$5,$6,false) ON CONFLICT(slug) DO NOTHING RETURNING id',
   [style.slug,style.title,category.name,category.id,style.description,style.imageUrl]
  )).rows.length===1;
  expect(await importGarbaManifest(manifest,insert)).toEqual({found:20,inserted:20,existing:0});
  expect(await importGarbaManifest(manifest,insert)).toEqual({found:20,inserted:0,existing:20});
  expect((await db.query<any>("SELECT count(*)::int AS count FROM styles WHERE category_id=$1 AND published=false",[category.id])).rows[0].count).toBe(20);
 }finally{await db.close()}
});
