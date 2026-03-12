import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { products, inventory } from './schema.js';

const { Pool } = pg;

// 固定租户 ID
const TENANT_A = 'a0000000-0000-0000-0000-000000000001';
const TENANT_B = 'b0000000-0000-0000-0000-000000000002';

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('缺少 DATABASE_URL 环境变量');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('开始填充种子数据...');

  // ===== 租户 A：3 个产品 =====
  const [productA1] = await db.insert(products).values({
    tenantId: TENANT_A,
    name: '无线蓝牙耳机',
    sku: 'BT-EARPHONE-001',
    description: '高品质降噪蓝牙耳机，续航 30 小时',
    price: '49.99',
  }).returning();

  const [productA2] = await db.insert(products).values({
    tenantId: TENANT_A,
    name: 'USB-C 充电线 (2m)',
    sku: 'CABLE-USBC-2M',
    description: '快充数据线，支持 100W PD',
    price: '12.99',
  }).returning();

  const [productA3] = await db.insert(products).values({
    tenantId: TENANT_A,
    name: '手机支架',
    sku: 'STAND-PHONE-001',
    description: '铝合金可调节手机支架',
    price: '19.99',
  }).returning();

  // 租户 A 库存
  await db.insert(inventory).values([
    { tenantId: TENANT_A, productId: productA1!.id, sku: 'BT-EARPHONE-001', quantity: 500 },
    { tenantId: TENANT_A, productId: productA2!.id, sku: 'CABLE-USBC-2M', quantity: 2000 },
    { tenantId: TENANT_A, productId: productA3!.id, sku: 'STAND-PHONE-001', quantity: 300 },
  ]);

  console.log(`租户 A (${TENANT_A}): 创建 3 个产品 + 库存`);

  // ===== 租户 B：2 个产品 =====
  const [productB1] = await db.insert(products).values({
    tenantId: TENANT_B,
    name: 'LED 台灯',
    sku: 'LAMP-LED-001',
    description: '护眼 LED 台灯，三档调光',
    price: '29.99',
  }).returning();

  const [productB2] = await db.insert(products).values({
    tenantId: TENANT_B,
    name: '笔记本散热垫',
    sku: 'COOLER-NB-001',
    description: '双风扇笔记本散热底座',
    price: '24.99',
  }).returning();

  // 租户 B 库存
  await db.insert(inventory).values([
    { tenantId: TENANT_B, productId: productB1!.id, sku: 'LAMP-LED-001', quantity: 150 },
    { tenantId: TENANT_B, productId: productB2!.id, sku: 'COOLER-NB-001', quantity: 200 },
  ]);

  console.log(`租户 B (${TENANT_B}): 创建 2 个产品 + 库存`);

  console.log('种子数据填充完成!');
  await pool.end();
}

seed().catch((err) => {
  console.error('种子数据填充失败:', err);
  process.exit(1);
});
