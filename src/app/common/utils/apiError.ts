
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly data: object | null;

  constructor(statusCode: number, message: string, data: object | null = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }

  static badRequest(message = "Bad Request", data: object | null = null) {
    return new ApiError(400, message, data);
  }

  static unAuthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Not Found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  static internal(message = "Internal Server Error", data: object | null = null) {
    return new ApiError(500, message, data);
  }
}

export default ApiError;
