class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授权') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403);
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};
