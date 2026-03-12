import type { Request, Response, NextFunction } from 'express';

// 扩展 Express Request 类型，挂载 tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId: string;
    }
  }
}

// 多租户中间件：从 X-Tenant-ID header 提取租户标识
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 健康检查不需要租户标识
  if (req.path === '/health') {
    next();
    return;
  }

  const tenantId = req.headers['x-tenant-id'] as string | undefined;

  if (!tenantId) {
    res.status(400).json({
      error: {
        code: 'MISSING_TENANT',
        message: '缺少 X-Tenant-ID 请求头',
      },
    });
    return;
  }

  req.tenantId = tenantId;
  next();
}
