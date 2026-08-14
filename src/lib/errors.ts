// The `message` stays the bare code ("UNAUTHORIZED", "FORBIDDEN") because 68
// routes still test `err.message === "UNAUTHORIZED"` by hand. Those keep
// working untouched while routes migrate to withRoute() one at a time.
// `clientMessage` is what the caller actually sees.
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
  constructor(clientMessage = "غير مصرح") {
    super("UNAUTHORIZED", 401, clientMessage);
  }
}

export class ForbiddenError extends HttpError {
  constructor(clientMessage = "ليس لديك صلاحية لهذا الإجراء") {
    super("FORBIDDEN", 403, clientMessage);
  }
}

export class NotFoundError extends HttpError {
  constructor(clientMessage = "غير موجود") {
    super("NOT_FOUND", 404, clientMessage);
  }
}

export class ConflictError extends HttpError {
  constructor(clientMessage = "العملية غير ممكنة في هذه الحالة") {
    super("CONFLICT", 409, clientMessage);
  }
}

export class ValidationError extends HttpError {
  constructor(clientMessage = "بيانات غير صالحة") {
    super("VALIDATION", 400, clientMessage);
  }
}
