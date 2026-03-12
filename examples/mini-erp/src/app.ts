import 'dotenv/config';
import express from 'express';
import productRouter from './modules/product/routes.js';
import orderRouter from './modules/order/routes.js';
import inventoryRouter from './modules/inventory/routes.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(tenantMiddleware);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 模块路由
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/inventory', inventoryRouter);

// 全局错误处理
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Mini ERP running on http://localhost:${PORT}`);
});

export default app;
