import { env } from './env';

export const isProdMode = () => env.APP_MODE === 'production';
export const isDevMode = () => env.APP_MODE === 'dev';

export const features = {
  devEndpoints: isDevMode(),
  devJwt: isDevMode(),
  mockCredits: isDevMode(),
  devEmail: isDevMode(),
  mockEvents: isDevMode(),
} as const;

export function assertDevMode(feature: string): void {
  if (isProdMode()) {
    throw new Error(`${feature} is not available in production mode`);
  }
}
