/**
 * Platform Engine — Abstract Base Class
 *
 * All platform integrations (eBay, Amazon, Walmart, MercadoLibre, etc.)
 * extend this base class to provide a unified API surface.
 *
 * Usage:
 *   class EbayEngine extends PlatformEngine { ... }
 *   class WalmartEngine extends PlatformEngine { ... }
 *
 * Register in PlatformRegistry to enable dynamic dispatch.
 */

// ─── Types ────────────────────────────────────────────────

export interface SyncResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  cursor?: string;
  syncedAt: Date;
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrierCode: string;
  shippedDate?: Date;
  lineItems?: string[]; // for partial shipment
}

export interface RefundRequest {
  amount: MoneyAmount;
  reason: string;
  lineItems?: Array<{ lineItemId: string; quantity: number }>;
}

export interface FulfillmentResult {
  fulfillmentId: string;
  status: string;
}

export interface RefundResult {
  refundId: string;
  amount: MoneyAmount;
  status: string;
}

export interface PublishResult {
  platformListingId: string;
  status: string;
  url?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  hasChildren: boolean;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'enum' | 'boolean';
  values?: Array<{ id: string; name: string }>;
}

// Simplified order/product types — replace with your domain types
export interface SyncedOrder {
  platformOrderId: string;
  buyerUsername?: string;
  totalAmount: MoneyAmount;
  platformStatus: string;
  lineItems: SyncedOrderItem[];
  rawData: unknown;
  platformCreatedAt: Date;
}

export interface SyncedOrderItem {
  platformLineItemId: string;
  sku?: string;
  title?: string;
  quantity: number;
  unitPrice?: MoneyAmount;
}

export interface SyncedTransaction {
  platformTransactionId: string;
  platformOrderId?: string;
  type: string;
  amount: MoneyAmount;
  fees: Array<{ type: string; amount: MoneyAmount }>;
  rawData: unknown;
  transactionDate: Date;
}

export interface SyncedPayout {
  platformPayoutId: string;
  amount: MoneyAmount;
  transactionCount: number;
  payoutDate: Date;
  rawData: unknown;
}

export interface ListingDraft {
  sku: string;
  title: string;
  description: string;
  price: MoneyAmount;
  quantity: number;
  images: string[];
  categoryId: string;
  attributes: Record<string, string>;
}

// ─── Abstract Base Class ──────────────────────────────────

export abstract class PlatformEngine {
  abstract readonly platform: string;
  abstract readonly displayName: string;

  // ─── Orders ──────────────────────────────────────────

  /**
   * Pull orders from platform since a given date.
   * Used by sync workers on a schedule (e.g., every 2 hours).
   */
  abstract syncOrders(storeId: string, since: Date): Promise<SyncResult<SyncedOrder>>;

  /**
   * Get a single order's current state from the platform.
   */
  abstract getOrder(storeId: string, platformOrderId: string): Promise<SyncedOrder>;

  // ─── Fulfillment ────────────────────────────────────

  /**
   * Upload tracking number to the platform.
   * This is the most critical cross-platform operation.
   */
  abstract pushTracking(
    storeId: string,
    platformOrderId: string,
    tracking: TrackingInfo,
  ): Promise<FulfillmentResult>;

  /**
   * Cancel an order on the platform.
   */
  abstract cancelOrder(
    storeId: string,
    platformOrderId: string,
    reason: string,
  ): Promise<void>;

  /**
   * Issue a refund on the platform.
   */
  abstract issueRefund(
    storeId: string,
    platformOrderId: string,
    refund: RefundRequest,
  ): Promise<RefundResult>;

  // ─── Products ────────────────────────────────────────

  /**
   * Publish a listing to the platform.
   */
  abstract publishListing(
    storeId: string,
    listing: ListingDraft,
  ): Promise<PublishResult>;

  /**
   * Update inventory quantity on the platform.
   */
  abstract updateInventory(
    storeId: string,
    sku: string,
    quantity: number,
  ): Promise<void>;

  /**
   * Update price on the platform.
   */
  abstract updatePrice(
    storeId: string,
    sku: string,
    price: MoneyAmount,
  ): Promise<void>;

  // ─── Financials ──────────────────────────────────────

  /**
   * Pull financial transactions from the platform.
   */
  abstract syncTransactions(
    storeId: string,
    since: Date,
  ): Promise<SyncResult<SyncedTransaction>>;

  /**
   * Pull payout records from the platform.
   */
  abstract syncPayouts(
    storeId: string,
    since: Date,
  ): Promise<SyncResult<SyncedPayout>>;

  // ─── Auth ────────────────────────────────────────────

  /**
   * Generate the OAuth authorization URL.
   * Redirect the user here to connect their store.
   */
  abstract getAuthUrl(redirectUri: string, state: string): string;

  /**
   * Exchange an authorization code for access + refresh tokens.
   */
  abstract exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;

  /**
   * Refresh an expired access token.
   */
  abstract refreshToken(refreshToken: string): Promise<TokenSet>;

  // ─── Categories ──────────────────────────────────────

  /**
   * Get category tree (or children of a parent category).
   */
  abstract getCategories(
    marketplaceId: string,
    parentId?: string,
  ): Promise<Category[]>;

  /**
   * Get attributes/item specifics for a category.
   */
  abstract getCategoryAttributes(
    marketplaceId: string,
    categoryId: string,
  ): Promise<CategoryAttribute[]>;
}

// ─── Platform Registry ────────────────────────────────────

export class PlatformRegistry {
  private engines = new Map<string, PlatformEngine>();

  register(engine: PlatformEngine): void {
    this.engines.set(engine.platform, engine);
  }

  get(platform: string): PlatformEngine {
    const engine = this.engines.get(platform);
    if (!engine) {
      throw new Error(`Platform engine not registered: ${platform}`);
    }
    return engine;
  }

  has(platform: string): boolean {
    return this.engines.has(platform);
  }

  list(): string[] {
    return Array.from(this.engines.keys());
  }
}

// Singleton registry
export const platformRegistry = new PlatformRegistry();
