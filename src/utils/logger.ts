export const logger = {
  info(...args: unknown[]): void {
    if (__DEV__) {
      console.log(...args);
    }
  },
  warn(...args: unknown[]): void {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  error(...args: unknown[]): void {
    if (__DEV__) {
      console.error(...args);
    }
    // Future extension: send to monitoring service (Sentry, etc.)
  },
};
