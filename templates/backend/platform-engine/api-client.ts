/**
 * HTTP API Client Template
 *
 * A robust HTTP client for platform API calls with:
 * - Automatic retry with exponential backoff
 * - Circuit breaker for fast failure
 * - Request/response logging
 * - Rate limiting awareness
 */

// ─── Types ────────────────────────────────────────────────

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;       // ms, default 30000
  maxRetries?: number;    // default 3
  retryBaseDelay?: number; // ms, default 1000
  headers?: Record<string, string>;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeout?: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
    public readonly retryable: boolean,
    public readonly retryAfterMs?: number,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

// ─── Circuit Breaker ──────────────────────────────────────

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeout: number = 60_000,
  ) {}

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true; // half-open: allow one request
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  get isOpen(): boolean {
    return this.state === 'open';
  }
}

// ─── API Client ───────────────────────────────────────────

export class ApiClient {
  private readonly config: Required<ApiClientConfig>;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30_000,
      maxRetries: 3,
      retryBaseDelay: 1_000,
      headers: {},
      ...config,
    };
    this.circuitBreaker = new CircuitBreaker(5, 60_000);
  }

  async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  async post<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  async put<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', path, options);
  }

  async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  private async request<T>(
    method: string,
    path: string,
    options?: ApiRequestOptions,
  ): Promise<T> {
    // Circuit breaker check
    if (!this.circuitBreaker.canExecute()) {
      throw new ApiError(503, 'Circuit breaker is open', null, true, 60_000);
    }

    // Build URL
    const url = new URL(path, this.config.baseUrl);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.headers,
      ...options?.headers,
    };

    // Retry loop
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          options?.timeout ?? this.config.timeout,
        );

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60');
          const error = new ApiError(429, 'Rate Limited', null, true, retryAfter * 1000);

          if (attempt < this.config.maxRetries) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
          throw error;
        }

        // Handle server errors (5xx) — retryable
        if (response.status >= 500) {
          const body = await response.text().catch(() => '');
          const error = new ApiError(response.status, response.statusText, body, true);
          this.circuitBreaker.onFailure();

          if (attempt < this.config.maxRetries) {
            const delay = this.config.retryBaseDelay * Math.pow(2, attempt);
            await this.sleep(delay);
            lastError = error;
            continue;
          }
          throw error;
        }

        // Handle client errors (4xx) — NOT retryable
        if (response.status >= 400) {
          const body = await response.json().catch(() => response.text());
          throw new ApiError(response.status, response.statusText, body, false);
        }

        // Success
        this.circuitBreaker.onSuccess();
        const data = await response.json() as T;
        return data;

      } catch (error) {
        if (error instanceof ApiError) throw error;

        // Network/timeout error — retryable
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryBaseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          lastError = error instanceof Error ? error : new Error(String(error));
          this.circuitBreaker.onFailure();
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error('Request failed after all retries');
  }

  /**
   * Make a raw request returning the full Response (for binary data like labels)
   */
  async rawRequest(
    method: string,
    path: string,
    options?: ApiRequestOptions,
  ): Promise<Response> {
    const url = new URL(path, this.config.baseUrl);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return fetch(url.toString(), {
      method,
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
