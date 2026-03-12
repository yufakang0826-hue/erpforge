// 应用错误基类
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 参数校验错误 (400)
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

// 资源未找到 (404)
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} (${id}) 不存在` : `${resource} 不存在`;
    super(404, msg, 'NOT_FOUND');
  }
}

// 业务逻辑错误 (422)
export class BusinessError extends AppError {
  constructor(message: string) {
    super(422, message, 'BUSINESS_ERROR');
  }
}
