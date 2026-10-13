import postgres from 'postgres';
import {drizzle} from 'drizzle-orm/postgres-js';
import * as schema from './schema';
export const sql=postgres(process.env.DATABASE_URL||'postgresql://quickwish:quickwish_local@localhost:5432/quickwish',{connection:{search_path:"quickwish,public"},max:Number(process.env.DB_POOL_MAX||5),connect_timeout:10,idle_timeout:20,prepare:false,onnotice:()=>{}});
export const db=drizzle(sql,{schema});
