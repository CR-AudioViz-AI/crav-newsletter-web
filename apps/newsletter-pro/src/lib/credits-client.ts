import { env } from './env';
import { isDevMode } from './feature-flags';

export interface AuthorizeCreditsRequest {
  org_id: string;
  amount: number;
  resource_type: 'email_send';
  resource_id: string;
  idempotency_key: string;
}

export interface AuthorizeCreditsResponse {
  authorization_id: string;
  authorized: boolean;
  balance: number;
  expires_at: string;
}

export interface CommitCreditsRequest {
  authorization_id: string;
  amount_used: number;
}

export interface RevertCreditsRequest {
  authorization_id: string;
  reason: string;
}

export class CreditsAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'CreditsAPIError';
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });

      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error: unknown) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function authorizeCredits(
  request: AuthorizeCreditsRequest
): Promise<AuthorizeCreditsResponse> {
  if (isDevMode()) {
    console.log('[Credits] Dev mode: mock authorize', request);
    return {
      authorization_id: `auth-${Date.now()}`,
      authorized: true,
      balance: 999999,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  if (!env.CREDITS_API_URL || !env.CREDITS_API_KEY) {
    throw new CreditsAPIError('Credits API not configured', 500, 'CONFIG_ERROR');
  }

  try {
    const response = await fetchWithRetry(
      `${env.CREDITS_API_URL}/credits/authorize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.CREDITS_API_KEY,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new CreditsAPIError(
        error.message || 'Authorization failed',
        response.status,
        error.code
      );
    }

    const data = await response.json();

    console.log(`[Credits] Authorized: ${data.authorization_id}`);

    return data;
  } catch (error: unknown) {
    if (error instanceof CreditsAPIError) {
      throw error;
    }

    console.error('[Credits] Authorization failed:', error);
    throw new CreditsAPIError(
      'Failed to authorize credits',
      500,
      'NETWORK_ERROR'
    );
  }
}

export async function commitCredits(
  request: CommitCreditsRequest
): Promise<void> {
  if (isDevMode()) {
    console.log('[Credits] Dev mode: mock commit', request);
    return;
  }

  if (!env.CREDITS_API_URL || !env.CREDITS_API_KEY) {
    throw new CreditsAPIError('Credits API not configured', 500, 'CONFIG_ERROR');
  }

  try {
    const response = await fetchWithRetry(
      `${env.CREDITS_API_URL}/credits/commit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.CREDITS_API_KEY,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new CreditsAPIError(
        error.message || 'Commit failed',
        response.status,
        error.code
      );
    }

    console.log(`[Credits] Committed: ${request.authorization_id}`);
  } catch (error: unknown) {
    if (error instanceof CreditsAPIError) {
      throw error;
    }

    console.error('[Credits] Commit failed:', error);
    throw new CreditsAPIError(
      'Failed to commit credits',
      500,
      'NETWORK_ERROR'
    );
  }
}

export async function revertCredits(
  request: RevertCreditsRequest
): Promise<void> {
  if (isDevMode()) {
    console.log('[Credits] Dev mode: mock revert', request);
    return;
  }

  if (!env.CREDITS_API_URL || !env.CREDITS_API_KEY) {
    throw new CreditsAPIError('Credits API not configured', 500, 'CONFIG_ERROR');
  }

  try {
    const response = await fetchWithRetry(
      `${env.CREDITS_API_URL}/credits/revert`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.CREDITS_API_KEY,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new CreditsAPIError(
        error.message || 'Revert failed',
        response.status,
        error.code
      );
    }

    console.log(`[Credits] Reverted: ${request.authorization_id}`);
  } catch (error: unknown) {
    if (error instanceof CreditsAPIError) {
      throw error;
    }

    console.error('[Credits] Revert failed:', error);
    throw new CreditsAPIError(
      'Failed to revert credits',
      500,
      'NETWORK_ERROR'
    );
  }
}

export async function recordCreditLedger(
  orgId: string,
  authorizationId: string,
  amount: number,
  status: 'authorized' | 'committed' | 'reverted',
  resourceId: string
): Promise<void> {
  console.log(`[Credits] Ledger: ${status} ${amount} credits for ${orgId}`);
}
