export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export function errorResponse(message: string, error: unknown) {
  return {
    error: message,
    details: getErrorMessage(error),
  };
}
