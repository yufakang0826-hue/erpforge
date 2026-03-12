/**
 * OAuth2 Client Template
 *
 * Supports two grant types:
 * - Authorization Code (eBay, Amazon, MercadoLibre)
 * - Client Credentials (Walmart)
 *
 * Features:
 * - Token caching with proactive refresh
 * - Configurable for any OAuth2 provider
 */

import type { TokenSet } from './base-engine.js';

// ─── Types ────────────────────────────────────────────────

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  grantType: 'authorization_code' | 'client_credentials';
}

interface TokenCache {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp ms
}

// ─── OAuth2 Client ────────────────────────────────────────

export class OAuth2Client {
  private tokenCache = new Map<string, TokenCache>();

  constructor(private readonly config: OAuthConfig) {}

  /**
   * Generate authorization URL (for Authorization Code flow)
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    if (this.config.grantType !== 'authorization_code') {
      throw new Error('getAuthorizationUrl is only for authorization_code grant type');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${this.encodeCredentials()}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${this.encodeCredentials()}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken, // Some providers return new refresh token
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Get access token via Client Credentials (Walmart pattern)
   */
  async getClientCredentialsToken(): Promise<TokenSet> {
    if (this.config.grantType !== 'client_credentials') {
      throw new Error('getClientCredentialsToken is only for client_credentials grant type');
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${this.encodeCredentials()}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Client credentials token failed: ${response.status} ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Get a valid access token for a store, refreshing if needed.
   * Uses cache to avoid unnecessary token requests.
   */
  async ensureValidToken(
    storeId: string,
    getStoredToken: () => Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date }>,
    saveToken: (token: TokenSet) => Promise<void>,
  ): Promise<string> {
    // Check cache
    const cached = this.tokenCache.get(storeId);
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) { // 5 min buffer
      return cached.accessToken;
    }

    // Get stored token
    const stored = await getStoredToken();

    // Still valid?
    if (stored.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
      this.tokenCache.set(storeId, {
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        expiresAt: stored.expiresAt.getTime(),
      });
      return stored.accessToken;
    }

    // Need refresh
    let newToken: TokenSet;
    if (this.config.grantType === 'client_credentials') {
      newToken = await this.getClientCredentialsToken();
    } else if (stored.refreshToken) {
      newToken = await this.refreshAccessToken(stored.refreshToken);
    } else {
      throw new Error(`No refresh token available for store ${storeId}. Re-authentication required.`);
    }

    // Save and cache
    await saveToken(newToken);
    this.tokenCache.set(storeId, {
      accessToken: newToken.accessToken,
      refreshToken: newToken.refreshToken,
      expiresAt: newToken.expiresAt.getTime(),
    });

    return newToken.accessToken;
  }

  private encodeCredentials(): string {
    return Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
  }
}
