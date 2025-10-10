import { randomUUID } from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  request_id?: string;
  org_id?: string;
  workspace_id?: string;
  user_id?: string;
  route?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  [key: string]: any;
}

function redactPII(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const piiFields = ['email', 'name', 'first_name', 'last_name', 'phone', 'address'];
  const redacted = { ...obj };

  for (const key of Object.keys(redacted)) {
    if (piiFields.some(field => key.toLowerCase().includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPII(redacted[key]);
    }
  }

  return redacted;
}

function shouldLog(level: LogLevel): boolean {
  const configLevel = process.env.LOG_LEVEL || 'info';
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  return levels.indexOf(level) >= levels.indexOf(configLevel as LogLevel);
}

export function createLogger(defaultContext: LogContext = {}) {
  const requestId = defaultContext.request_id || randomUUID();

  return {
    debug(message: string, context: LogContext = {}) {
      if (!shouldLog('debug')) return;

      const safeContext = redactPII({ ...defaultContext, ...context, request_id: requestId });

      console.log(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...safeContext,
      }));
    },

    info(message: string, context: LogContext = {}) {
      if (!shouldLog('info')) return;

      const safeContext = redactPII({ ...defaultContext, ...context, request_id: requestId });

      console.log(JSON.stringify({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        ...safeContext,
      }));
    },

    warn(message: string, context: LogContext = {}) {
      if (!shouldLog('warn')) return;

      const safeContext = redactPII({ ...defaultContext, ...context, request_id: requestId });

      console.warn(JSON.stringify({
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        ...safeContext,
      }));
    },

    error(message: string, error: Error | unknown, context: LogContext = {}) {
      if (!shouldLog('error')) return;

      const safeContext = redactPII({ ...defaultContext, ...context, request_id: requestId });

      console.error(JSON.stringify({
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
        ...safeContext,
      }));
    },
  };
}

export const metrics = {
  counter(name: string, value: number = 1, tags: Record<string, string> = {}) {
    console.log(JSON.stringify({
      type: 'counter',
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    }));
  },

  gauge(name: string, value: number, tags: Record<string, string> = {}) {
    console.log(JSON.stringify({
      type: 'gauge',
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    }));
  },

  histogram(name: string, value: number, tags: Record<string, string> = {}) {
    console.log(JSON.stringify({
      type: 'histogram',
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    }));
  },
};
