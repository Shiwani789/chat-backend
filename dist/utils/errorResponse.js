"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
exports.errorResponse = errorResponse;
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return 'Unknown error';
}
function errorResponse(message, error) {
    return {
        error: message,
        details: getErrorMessage(error),
    };
}
