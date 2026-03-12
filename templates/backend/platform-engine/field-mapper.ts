/**
 * Field Mapper Template
 *
 * Maps platform-specific field names and structures to internal field names.
 * Supports nested paths (e.g., "pricingSummary.total.value") and custom transforms.
 */

// ─── Types ────────────────────────────────────────────────

export interface FieldMapping {
  /** Source path in platform data (dot-separated for nested) */
  source: string;
  /** Target field name in internal model */
  target: string;
  /** Optional transform function */
  transform?: (value: unknown) => unknown;
}

export interface StatusMapping {
  [platformStatus: string]: string; // platform status → internal status
}

export interface FeeTypeMapping {
  [platformFeeType: string]: string; // platform fee type → normalized category
}

// ─── Field Mapper ─────────────────────────────────────────

export class FieldMapper {
  constructor(
    private readonly mappings: FieldMapping[],
    private readonly statusMap?: StatusMapping,
    private readonly feeTypeMap?: FeeTypeMapping,
  ) {}

  /**
   * Map a platform object to internal format using field mappings.
   */
  mapFields(source: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const mapping of this.mappings) {
      let value = getNestedValue(source, mapping.source);
      if (mapping.transform && value !== undefined) {
        value = mapping.transform(value);
      }
      result[mapping.target] = value ?? null;
    }

    return result;
  }

  /**
   * Normalize a platform status to internal status.
   */
  normalizeStatus(platformStatus: string): string {
    if (!this.statusMap) {
      throw new Error('No status mapping configured');
    }
    return this.statusMap[platformStatus] ?? 'UNKNOWN';
  }

  /**
   * Normalize a platform fee type to internal category.
   */
  normalizeFeeType(platformFeeType: string): string {
    if (!this.feeTypeMap) {
      throw new Error('No fee type mapping configured');
    }
    return this.feeTypeMap[platformFeeType] ?? 'other';
  }
}

// ─── Helper ───────────────────────────────────────────────

/**
 * Get a value from a nested object using dot-separated path.
 *
 * @example
 * getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c') → 42
 * getNestedValue({ items: [{ id: 1 }] }, 'items.0.id') → 1
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

// ─── Example Usage ────────────────────────────────────────

/**
 * Example: eBay order field mapping
 *
 * const ebayOrderMapper = new FieldMapper(
 *   [
 *     { source: 'orderId', target: 'platformOrderId' },
 *     { source: 'buyer.username', target: 'buyerUsername' },
 *     { source: 'pricingSummary.total.value', target: 'totalAmount', transform: Number },
 *     { source: 'pricingSummary.total.currency', target: 'totalAmountCurrency' },
 *     { source: 'pricingSummary.priceSubtotal.value', target: 'priceSubtotal', transform: Number },
 *     { source: 'pricingSummary.deliveryCost.value', target: 'deliveryCost', transform: Number },
 *     { source: 'orderFulfillmentStatus', target: 'platformStatus' },
 *     { source: 'creationDate', target: 'platformCreatedAt', transform: (v) => new Date(v as string) },
 *   ],
 *   // Status mapping
 *   {
 *     'NOT_STARTED': 'PENDING',
 *     'IN_PROGRESS': 'PAID',
 *     'FULFILLED': 'SHIPPED',
 *   },
 *   // Fee type mapping
 *   {
 *     'FINAL_VALUE_FEE': 'commission',
 *     'AD_FEE': 'advertising',
 *     'INTERNATIONAL_FEE': 'international',
 *     'INSERTION_FEE': 'listing_fee',
 *   },
 * );
 *
 * const internalOrder = ebayOrderMapper.mapFields(ebayApiResponse);
 * const normalizedStatus = ebayOrderMapper.normalizeStatus(ebayApiResponse.orderFulfillmentStatus);
 */
