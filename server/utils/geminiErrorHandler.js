// We'll check error messages and properties instead of instanceof
// to avoid import issues with GoogleGenerativeAIError

class GeminiErrorHandler {
  static async handleApiCall(apiCall, context = '', retries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        const errorInfo = this.analyzeError(error, context, attempt, retries);
        
        // Log the error
        this.logError(errorInfo);
        
        // If this is the last attempt or a non-retryable error, throw
        if (attempt === retries || !errorInfo.shouldRetry) {
          throw this.createUserFriendlyError(errorInfo);
        }
        
        // Wait before retrying (exponential backoff)
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[GEMINI] Retrying in ${delay}ms... (Attempt ${attempt + 1}/${retries})`);
        await this.sleep(delay);
      }
    }
  }
  
  static analyzeError(error, context, attempt, maxRetries) {
    const errorInfo = {
      originalError: error,
      context,
      attempt,
      maxRetries,
      timestamp: new Date().toISOString(),
      shouldRetry: false,
      errorType: 'unknown',
      userMessage: 'An unexpected error occurred',
      technicalMessage: error.message || 'Unknown error'
    };
    
    // Check if this is a Gemini API error by examining error properties and messages
    if (error.name === 'GoogleGenerativeAIError' || 
        error.constructor.name === 'GoogleGenerativeAIError' ||
        (error.message && (error.message.includes('[400') || error.message.includes('[401') || 
                          error.message.includes('[403') || error.message.includes('[429') || 
                          error.message.includes('[500') || error.message.includes('[503')))) {
      // Handle Google Generative AI specific errors
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        errorInfo.errorType = 'quota_exceeded';
        errorInfo.shouldRetry = true;
        errorInfo.userMessage = 'API quota exceeded. The system will automatically retry. Please try again in a few moments.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorInfo.errorType = 'unauthorized';
        errorInfo.shouldRetry = false;
        errorInfo.userMessage = 'API authentication failed. Please check your API key configuration.';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorInfo.errorType = 'forbidden';
        errorInfo.shouldRetry = false;
        errorInfo.userMessage = 'API access forbidden. Please check your API key permissions.';
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        errorInfo.errorType = 'server_error';
        errorInfo.shouldRetry = true;
        errorInfo.userMessage = 'Google AI service is temporarily unavailable. Retrying...';
      } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        errorInfo.errorType = 'service_unavailable';
        errorInfo.shouldRetry = true;
        errorInfo.userMessage = 'Google AI service is temporarily unavailable. Retrying...';
      } else if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        errorInfo.errorType = 'timeout';
        errorInfo.shouldRetry = true;
        errorInfo.userMessage = 'Request timed out. Retrying...';
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        errorInfo.errorType = 'bad_request';
        errorInfo.shouldRetry = false;
        errorInfo.userMessage = 'Invalid request format. Please try rephrasing your question.';
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorInfo.errorType = 'network_error';
      errorInfo.shouldRetry = true;
      errorInfo.userMessage = 'Network connection error. Retrying...';
    } else if (error.code === 'ETIMEDOUT') {
      errorInfo.errorType = 'timeout';
      errorInfo.shouldRetry = true;
      errorInfo.userMessage = 'Request timed out. Retrying...';
    }
    
    return errorInfo;
  }
  
  static logError(errorInfo) {
    const logLevel = errorInfo.shouldRetry ? 'WARN' : 'ERROR';
    const retryInfo = errorInfo.shouldRetry ? `(Retryable - Attempt ${errorInfo.attempt}/${errorInfo.maxRetries})` : '(Not Retryable)';
    
    console.log(`[${logLevel}] [GEMINI] ${errorInfo.context} - ${errorInfo.errorType.toUpperCase()} ${retryInfo}`);
    console.log(`[${logLevel}] [GEMINI] User Message: ${errorInfo.userMessage}`);
    console.log(`[${logLevel}] [GEMINI] Technical Details: ${errorInfo.technicalMessage}`);
    console.log(`[${logLevel}] [GEMINI] Timestamp: ${errorInfo.timestamp}`);
    
    if (!errorInfo.shouldRetry) {
      console.log(`[ERROR] [GEMINI] Full Error Stack:`, errorInfo.originalError);
    }
  }
  
  static createUserFriendlyError(errorInfo) {
    const error = new Error(errorInfo.userMessage);
    error.originalError = errorInfo.originalError;
    error.errorType = errorInfo.errorType;
    error.technicalMessage = errorInfo.technicalMessage;
    error.context = errorInfo.context;
    error.isGeminiError = true;
    return error;
  }
  
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Helper method to get user-friendly error messages for the frontend
  static getPublicErrorMessage(error) {
    if (error.isGeminiError) {
      return error.message;
    }
    
    // Fallback for other errors
    return 'An unexpected error occurred. Please try again later.';
  }
}

module.exports = GeminiErrorHandler;
