class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;

    // Capture stack trace (clean error stack)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;