import { common } from "@/lib/messages";

export class HttpError extends Error {
  readonly status: number;
  readonly clientMessage: string;

  constructor(code: string, status: number, clientMessage: string) {
    super(code);
    this.name = code;
    this.status = status;
    this.clientMessage = clientMessage;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(clientMessage: string = common.unauthorized) {
    super("UNAUTHORIZED", 401, clientMessage);
  }
}

export class ForbiddenError extends HttpError {
  constructor(clientMessage: string = common.forbidden) {
    super("FORBIDDEN", 403, clientMessage);
  }
}

export class CrossOriginError extends HttpError {
  constructor(clientMessage: string = common.crossOrigin) {
    super("CROSS_ORIGIN", 403, clientMessage);
  }
}

export class NotFoundError extends HttpError {
  constructor(clientMessage: string = "غير موجود") {
    super("NOT_FOUND", 404, clientMessage);
  }
}

export class ConflictError extends HttpError {
  constructor(clientMessage: string = "العملية غير ممكنة في هذه الحالة") {
    super("CONFLICT", 409, clientMessage);
  }
}

export class ValidationError extends HttpError {
  constructor(clientMessage: string = common.invalidBody) {
    super("VALIDATION", 400, clientMessage);
  }
}
