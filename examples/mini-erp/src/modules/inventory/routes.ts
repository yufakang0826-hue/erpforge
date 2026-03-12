import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { adjustInventorySchema, initInventorySchema } from './types.js';
import * as service from './service.js';

const router = Router();

// GET / — 库存列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lowStock, threshold } = req.query;
    const result = await service.listInventory(req.tenantId, {
      lowStock: lowStock === 'true',
      threshold: threshold ? Number(threshold) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /:productId — 查询单个产品库存
router.get('/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await service.getInventory(req.tenantId, req.params.productId);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST / — 初始化库存记录
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = initInventorySchema.parse(req.body);
    const record = await service.initInventory(req.tenantId, input);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// PATCH /:productId/adjust — 调整库存
router.patch('/:productId/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = adjustInventorySchema.parse(req.body);
    const record = await service.adjustInventory(req.tenantId, req.params.productId, input);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
