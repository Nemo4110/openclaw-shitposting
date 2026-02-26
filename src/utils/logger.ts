/**
 * 日志工具
 * 简单封装 console，添加前缀和级别
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    return `${timestamp} ${level.toUpperCase().padEnd(5)} ${this.prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }
}

const loggers = new Map<string, Logger>();

export function createLogger(name: string): Logger {
  if (!loggers.has(name)) {
    loggers.set(name, new ConsoleLogger(name));
  }
  return loggers.get(name)!;
}
