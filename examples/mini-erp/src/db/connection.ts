import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('缺少 DATABASE_URL 环境变量');
}

// 创建 pg 连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 导出 Drizzle ORM 实例
export const db = drizzle(pool, { schema });
