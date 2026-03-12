import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createProductSchema, updateProductSchema } from './types.js';
import * as service from './service.js';

const router = Router();

// GET / — 产品列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, page, pageSize } = req.query;
    const result = await service.listProducts(req.tenantId, {
      status: status as string | undefined,
      search: search as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /:id — 获取单个产品
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await service.getProduct(req.tenantId, req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST / — 创建产品
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await service.createProduct(req.tenantId, input);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — 更新产品
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateProductSchema.parse(req.body);
    const product = await service.updateProduct(req.tenantId, req.params.id, input);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — 软删除产品
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await service.deleteProduct(req.tenantId, req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;
