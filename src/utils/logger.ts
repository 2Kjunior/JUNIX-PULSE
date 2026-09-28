export const logger = {
  error(message: string): void {
    if (__DEV__) {
      console.error(message);
    }
  },
};