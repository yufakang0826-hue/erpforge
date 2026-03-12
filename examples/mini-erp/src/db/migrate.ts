import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('缺少 DATABASE_URL 环境变量');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('开始执行数据库迁移...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('数据库迁移完成');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('迁移失败:', err);
  process.exit(1);
});
