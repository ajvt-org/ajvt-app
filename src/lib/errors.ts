import { common } from "@/lib/messages";
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
  constructor(clientMessage: string = common.unauthorized) {
    super("UNAUTHORIZED", 401, clientMessage);
  }
}

export class ForbiddenError extends HttpError {
  constructor(clientMessage: string = common.forbidden) {
    super("FORBIDDEN", 403, clientMessage);
  }
}

// Separate from ForbiddenError, whose message is about the caller's role: this
// one is about where the request came from, and the caller may well have the
// role. Same status, different sentence.
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
