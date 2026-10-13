import {beforeAll,afterAll,test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const q=async(sql:string,args:any[]=[])=> (await db.query<any>(sql,args)).rows;
beforeAll(async()=>{await db.exec(await Bun.file('packages/db/migrations/0001_initial.sql').text());await db.exec(await Bun.file('packages/db/migrations/0002_service_categories.sql').text());await db.exec("INSERT INTO packages(code,name,amount,quantity) VALUES('SINGLE','single',4900,1) ON CONFLICT DO NOTHING");});
afterAll(()=>db.close());
test('initial service categories are seeded in display order',async()=>{const rows=await q('SELECT slug,name FROM service_categories ORDER BY display_order');expect(rows.map(x=>x.slug)).toEqual(['garba-festive','birthday-collage','traditional-wear','smart-casual']);});
test('hidden category drops from public style query but preserves existing orders',async()=>{
 const [cat]=await q("SELECT id FROM service_categories WHERE slug='garba-festive'");
 const [style]=await q("INSERT INTO styles(slug,title,category,category_id,description,image_url,published) VALUES('garba-test','Garba Test','Garba & Festive',$1,'A festive service','/images/showcase/garba-transformation.png',true) RETURNING id",[cat.id]);
 const [order]=await q("INSERT INTO orders(code,style_id,package_code,phone,amount,quantity,payee,merchant,consent_version,create_key,create_hash) VALUES($1,$2,'SINGLE','919876543210',4900,1,'merchant@upi','Studio','v1',$3,'hash') RETURNING id",['QW-'+crypto.randomUUID(),style.id,crypto.randomUUID()]);
 expect((await q("SELECT s.id FROM styles s LEFT JOIN service_categories c ON c.id=s.category_id WHERE s.published AND (s.category_id IS NULL OR c.published) AND s.id=$1",[style.id]))).toHaveLength(1);
 await q('UPDATE service_categories SET published=false WHERE id=$1',[cat.id]);
 expect((await q("SELECT s.id FROM styles s LEFT JOIN service_categories c ON c.id=s.category_id WHERE s.published AND (s.category_id IS NULL OR c.published) AND s.id=$1",[style.id]))).toHaveLength(0);
 expect((await q('SELECT id FROM orders WHERE id=$1',[order.id]))).toHaveLength(1);
});
test('referenced categories cannot be deleted by database relationship',async()=>{const [cat]=await q("SELECT id FROM service_categories WHERE slug='smart-casual'");await q("INSERT INTO styles(slug,title,category,category_id,description,image_url,published) VALUES('smart-test','Smart Test','Smart Casual',$1,'A smart casual service','/images/showcase/smart-casual-transformation.png',true)",[cat.id]);await expect(q('DELETE FROM service_categories WHERE id=$1',[cat.id])).rejects.toThrow();});
