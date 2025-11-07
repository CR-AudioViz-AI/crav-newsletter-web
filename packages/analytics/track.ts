export interface AnalyticsConfig {
  apiUrl?: string;
  apiKey?: string;
  debug?: boolean;
}

export interface TrackProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface IdentifyTraits {
  [key: string]: string | number | boolean | null | undefined;
}

class Analytics {
  private config: AnalyticsConfig;
  private userId: string | null = null;
  private anonymousId: string;

  constructor(config: AnalyticsConfig = {}) {
    this.config = config;
    this.anonymousId = this.getOrCreateAnonymousId();
  }

  private getOrCreateAnonymousId(): string {
    const key = 'crav_anonymous_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `anon_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }

  private log(...args: any[]) {
    if (this.config.debug) {
      console.log('[Analytics]', ...args);
    }
  }

  private async send(type: string, payload: any) {
    const event = {
      type,
      userId: this.userId,
      anonymousId: this.anonymousId,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    this.log('Sending event:', event);

    if (!this.config.apiUrl) {
      this.log('No API URL configured, skipping send');
      return;
    }

    try {
      await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify(event),
      });
    } catch (error: unknown) {
      console.error('[Analytics] Failed to send event:', error);
    }
  }

  identify(userId: string, traits?: IdentifyTraits) {
    this.userId = userId;
    this.send('identify', { userId, traits });
  }

  track(event: string, properties?: TrackProperties) {
    this.send('track', { event, properties });
  }

  page(name: string, properties?: TrackProperties) {
    this.send('page', { name, properties });
  }

  reset() {
    this.userId = null;
    localStorage.removeItem('crav_anonymous_id');
    this.anonymousId = this.getOrCreateAnonymousId();
  }
}

let instance: Analytics | null = null;

export function init(config: AnalyticsConfig): Analytics {
  instance = new Analytics(config);
  return instance;
}

export function identify(userId: string, traits?: IdentifyTraits): void {
  if (!instance) {
    console.warn('[Analytics] Not initialized. Call init() first.');
    return;
  }
  instance.identify(userId, traits);
}

export function track(event: string, properties?: TrackProperties): void {
  if (!instance) {
    console.warn('[Analytics] Not initialized. Call init() first.');
    return;
  }
  instance.track(event, properties);
}

export function page(name: string, properties?: TrackProperties): void {
  if (!instance) {
    console.warn('[Analytics] Not initialized. Call init() first.');
    return;
  }
  instance.page(name, properties);
}

export function reset(): void {
  if (!instance) {
    console.warn('[Analytics] Not initialized. Call init() first.');
    return;
  }
  instance.reset();
}
