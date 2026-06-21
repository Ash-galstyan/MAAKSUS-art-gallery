// backend/src/lib/http-error.ts
/**
 * Throw this anywhere in a service/controller; the central error handler
 * formats it for the client. Never leaks server internals — only `message`
 * and `code` reach the user.
 *
 *   throw new HttpError(404, 'Artwork not found', 'ARTWORK_NOT_FOUND');
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'HTTP_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details?: unknown) {
    return new HttpError(400, message, code, details);
  }
  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new HttpError(401, message, code);
  }
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new HttpError(403, message, code);
  }
  static notFound(message = 'Not found', code = 'NOT_FOUND') {
    return new HttpError(404, message, code);
  }
  static conflict(message = 'Conflict', code = 'CONFLICT') {
    return new HttpError(409, message, code);
  }
}
