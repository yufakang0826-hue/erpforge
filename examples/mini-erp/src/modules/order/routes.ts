import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createOrderSchema, updateStatusSchema } from './types.js';
import * as service from './service.js';

const router = Router();

// GET / — 订单列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, pageSize } = req.query;
    const result = await service.listOrders(req.tenantId, {
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /:id — 获取单个订单
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await service.getOrder(req.tenantId, req.params.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST / — 创建订单
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await service.createOrder(req.tenantId, input);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/status — 更新订单状态
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason } = updateStatusSchema.parse(req.body);
    const order = await service.updateOrderStatus(req.tenantId, req.params.id, status, reason);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

export default router;
