// frontend/src/app/core/api-models/api-error.model.ts
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
