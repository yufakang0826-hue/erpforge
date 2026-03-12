# Double-Entry Accounting Model — Cross-Border E-Commerce

> Distilled from production implementation handling multi-currency transactions across eBay, Walmart, Amazon, and MercadoLibre with CNY as functional currency.

---

## 1. Core Principle

Every financial event generates a journal entry where **total debits = total credits** (trial balance invariant). This is enforced at the database level, not just application level.

---

## 2. Five-Table Model (+ Account Balances)

### 2.1 Table Overview

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 1 | `chart_of_accounts` | Chart of accounts (COA) | code, name, type, parent_id, balance_direction |
| 2 | `journal_entries` | Journal entry header | entry_no, date, status, source_module, idempotency_key |
| 3 | `journal_entry_lines` | Journal entry lines | account_id, debit_amount, credit_amount, original_currency, exchange_rate |
| 4 | `fiscal_periods` | Accounting periods | period (YYYY-MM), status (open/closing/closed) |
| 5 | `exchange_rates` | Exchange rate snapshots | from_currency, to_currency, rate, rate_date, source |
| 6 | `account_balances` | Period balance cache | account_id, fiscal_period, opening/period/closing balances |

### 2.2 Detailed Schema

```sql
-- 1. Chart of Accounts
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  code VARCHAR(20) NOT NULL,           -- e.g., '1001'
  name VARCHAR(200) NOT NULL,          -- e.g., 'Bank - USD'
  name_en VARCHAR(200),
  type VARCHAR(20) NOT NULL,           -- asset | liability | equity | revenue | expense
  parent_id UUID REFERENCES chart_of_accounts(id),
  level INTEGER NOT NULL DEFAULT 1,
  balance_direction VARCHAR(10) NOT NULL, -- debit | credit
  currency CHAR(3),                    -- NULL = follows functional currency; set for bank accounts
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_leaf BOOLEAN NOT NULL DEFAULT true,
  category VARCHAR(30),                -- report classification (see Section 3)
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, code),
  CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  CHECK(balance_direction IN ('debit', 'credit'))
);

-- 2. Journal Entries (Header)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entry_no VARCHAR(30) NOT NULL,       -- JE-202603-00001
  entry_date DATE NOT NULL,
  fiscal_period VARCHAR(7) NOT NULL,   -- '2026-03'

  -- Source traceability
  source_module VARCHAR(30) NOT NULL,  -- order | finance | procurement | logistics | manual
  source_event VARCHAR(50),            -- order_confirmed | payment_received | ...
  source_entity_type VARCHAR(30),      -- order | transaction | payout | ...
  source_entity_id VARCHAR(100),

  -- Idempotency (prevents duplicate entries for same business event)
  idempotency_key VARCHAR(200) NOT NULL,

  description VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft → posted → reversed

  -- Totals (redundant, for verification)
  total_debit NUMERIC(19,4) NOT NULL DEFAULT 0,
  total_credit NUMERIC(19,4) NOT NULL DEFAULT 0,

  functional_currency CHAR(3) NOT NULL DEFAULT 'CNY',

  -- Reversal chain
  reversed_by UUID,
  reversal_of UUID,

  metadata JSONB,
  posted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, entry_no),
  UNIQUE(tenant_id, idempotency_key)
);

-- 3. Journal Entry Lines (Multi-Currency Core)
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  line_no INTEGER NOT NULL,

  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  account_code VARCHAR(20) NOT NULL,   -- denormalized for reporting speed

  -- Functional currency amounts (must not both be non-zero)
  debit_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(19,4) NOT NULL DEFAULT 0,

  -- Original currency
  original_currency CHAR(3) NOT NULL DEFAULT 'CNY',
  original_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  exchange_rate NUMERIC(15,8) NOT NULL DEFAULT 1,
  exchange_rate_date DATE,

  description VARCHAR(300),

  -- Multi-dimensional analysis
  dim_store_id UUID,
  dim_platform VARCHAR(20),
  dim_order_id VARCHAR(100),
  dim_sku VARCHAR(200),

  UNIQUE(journal_entry_id, line_no),
  CHECK(debit_amount >= 0),
  CHECK(credit_amount >= 0),
  CHECK(NOT (debit_amount > 0 AND credit_amount > 0))
);

-- 4. Fiscal Periods
CREATE TABLE fiscal_periods (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  period VARCHAR(7) NOT NULL,          -- '2026-03'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open → closing → closed
  closed_by UUID,
  closed_at TIMESTAMPTZ,
  UNIQUE(tenant_id, period),
  CHECK(status IN ('open', 'closing', 'closed'))
);

-- 5. Exchange Rates
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  from_currency CHAR(3) NOT NULL,
  to_currency CHAR(3) NOT NULL,
  rate NUMERIC(15,8) NOT NULL,
  rate_date DATE NOT NULL,
  source VARCHAR(30) NOT NULL,         -- api_auto | manual | platform
  UNIQUE(tenant_id, from_currency, to_currency, rate_date)
);

-- 6. Account Balances (period cache)
CREATE TABLE account_balances (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  fiscal_period VARCHAR(7) NOT NULL,
  opening_debit NUMERIC(19,4) NOT NULL DEFAULT 0,
  opening_credit NUMERIC(19,4) NOT NULL DEFAULT 0,
  period_debit NUMERIC(19,4) NOT NULL DEFAULT 0,
  period_credit NUMERIC(19,4) NOT NULL DEFAULT 0,
  closing_debit NUMERIC(19,4) NOT NULL DEFAULT 0,
  closing_credit NUMERIC(19,4) NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, account_id, fiscal_period)
);
```

---

## 3. Recommended 35 Standard Accounts (Initial Seed)

```yaml
# Assets (1xxx) — balance_direction: debit
- { code: '1001', name: 'Cash', type: asset, category: null }
- { code: '1002', name: 'Bank - CNY', type: asset, currency: CNY }
- { code: '1003', name: 'Bank - USD', type: asset, currency: USD }
- { code: '1004', name: 'Bank - GBP', type: asset, currency: GBP }
- { code: '1005', name: 'Bank - EUR', type: asset, currency: EUR }
- { code: '1006', name: 'Bank - AUD', type: asset, currency: AUD }
- { code: '1007', name: 'Bank - MXN', type: asset, currency: MXN }
- { code: '1008', name: 'Bank - BRL', type: asset, currency: BRL }
- { code: '1101', name: 'Accounts Receivable - Platform', type: asset }
- { code: '1201', name: 'Inventory', type: asset }
- { code: '1301', name: 'Prepaid Expenses', type: asset }

# Liabilities (2xxx) — balance_direction: credit
- { code: '2001', name: 'Accounts Payable - Suppliers', type: liability }
- { code: '2002', name: 'Accounts Payable - Logistics', type: liability }
- { code: '2003', name: 'Tax Payable', type: liability }
- { code: '2101', name: 'Customer Deposits', type: liability }

# Equity (3xxx) — balance_direction: credit
- { code: '3001', name: 'Owner Equity', type: equity }
- { code: '3002', name: 'Retained Earnings', type: equity }

# Revenue (4xxx) — balance_direction: credit
- { code: '4001', name: 'Sales Revenue', type: revenue, category: revenue }
- { code: '4002', name: 'Shipping Revenue', type: revenue, category: shipping_revenue }
- { code: '4003', name: 'Other Revenue', type: revenue, category: revenue }

# Expenses (5xxx) — balance_direction: debit
- { code: '5001', name: 'Cost of Goods Sold', type: expense, category: cogs }
- { code: '5101', name: 'Platform Commission - eBay', type: expense, category: platform_fee }
- { code: '5102', name: 'Platform Commission - Walmart', type: expense, category: platform_fee }
- { code: '5103', name: 'Platform Commission - Amazon', type: expense, category: platform_fee }
- { code: '5104', name: 'Platform Commission - MercadoLibre', type: expense, category: platform_fee }
- { code: '5201', name: 'Shipping Cost - Domestic', type: expense, category: shipping }
- { code: '5202', name: 'Shipping Cost - International', type: expense, category: shipping }
- { code: '5203', name: 'Shipping Cost - Returns', type: expense, category: shipping }
- { code: '5301', name: 'Advertising Expense', type: expense, category: other_expense }
- { code: '5401', name: 'Sales Refund', type: expense, category: refund }
- { code: '5501', name: 'FX Gain', type: expense, category: fx_gain }  # negative expense = income
- { code: '5502', name: 'FX Loss', type: expense, category: fx_loss }
- { code: '5601', name: 'Payment Processing Fee', type: expense, category: platform_fee }
- { code: '5701', name: 'Warehouse & Storage', type: expense, category: other_expense }
- { code: '5801', name: 'Other Expense', type: expense, category: other_expense }
```

---

## 4. Journal Entry Engine Rules

### 4.1 Automated Entry Templates

| Business Event | Debit | Credit | Source Module |
|---------------|-------|--------|---------------|
| **Order confirmed** | Accounts Receivable (1101) | Sales Revenue (4001) | order |
| **Payment received** (platform payout) | Bank - {currency} (100x) | Accounts Receivable (1101) | finance |
| **Platform commission** | Platform Commission (510x) | Accounts Receivable (1101) | finance |
| **Shipping cost** | Shipping Cost (520x) | Bank/Accounts Payable (100x/2002) | logistics |
| **Purchase (inventory in)** | Inventory (1201) | Accounts Payable - Suppliers (2001) | procurement |
| **COGS (on shipment)** | COGS (5001) | Inventory (1201) | order |
| **Refund issued** | Sales Refund (5401) | Accounts Receivable (1101) | order |
| **FX gain (settlement)** | Bank (100x) | FX Gain (5501) | finance |
| **FX loss (settlement)** | FX Loss (5502) | Bank (100x) | finance |
| **Advertising spend** | Advertising Expense (5301) | Accounts Receivable (1101) | finance |

### 4.2 Idempotency Key Pattern

```
{source_module}:{source_event}:{source_entity_id}
```

Examples:
- `order:confirmed:ord_abc123`
- `finance:payout_received:payout_xyz789`
- `logistics:shipping_cost:shipment_def456`

This prevents duplicate journal entries when the same business event is processed multiple times (e.g., during retry).

### 4.3 Entry Creation Flow

```typescript
async function createJournalEntry(params: {
  tenantId: string;
  date: Date;
  sourceModule: string;
  sourceEvent: string;
  sourceEntityId: string;
  description: string;
  lines: Array<{
    accountCode: string;
    debitAmount?: number;
    creditAmount?: number;
    originalCurrency?: string;
    originalAmount?: number;
    exchangeRate?: number;
    dimensions?: { storeId?: string; platform?: string; orderId?: string; sku?: string };
  }>;
}) {
  // 1. Check idempotency key
  const idempotencyKey = `${params.sourceModule}:${params.sourceEvent}:${params.sourceEntityId}`;
  const existing = await findByIdempotencyKey(params.tenantId, idempotencyKey);
  if (existing) return existing; // Already processed

  // 2. Validate fiscal period is open
  const period = formatPeriod(params.date); // '2026-03'
  const fp = await getFiscalPeriod(params.tenantId, period);
  if (fp.status !== 'open') throw new Error(`Period ${period} is not open`);

  // 3. Resolve account codes → IDs
  // 4. Calculate exchange rates for non-functional currencies

  // 5. Verify trial balance: SUM(debit) === SUM(credit)
  const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new Error('Trial balance violation');
  }

  // 6. Insert within transaction
  // 7. If exchange rate was estimated, set status = 'draft'; else 'posted'
}
```

---

## 5. Multi-Currency Handling

### 5.1 Key Concepts

| Concept | Description |
|---------|-------------|
| **Transaction currency** | The currency of the original transaction (e.g., USD for eBay US) |
| **Functional currency** | The company's base reporting currency (e.g., CNY) |
| **Exchange rate** | Conversion factor: functional_amount = original_amount × exchange_rate |

### 5.2 Exchange Rate Timing

| Timing | When to Use |
|--------|-------------|
| **Transaction date** | When order is confirmed (most common) |
| **Settlement date** | When platform payout is received |
| **Period-end** | For unrealized FX gain/loss calculation |

### 5.3 FX Gain/Loss Calculation

**Realized** (on settlement):
```
FX_diff = settlement_amount_in_functional - original_entry_amount_in_functional
If FX_diff > 0 → FX Gain (credit 5501)
If FX_diff < 0 → FX Loss (debit 5502)
```

**Unrealized** (period-end revaluation):
```
For each open receivable/payable in foreign currency:
  current_value = original_amount × period_end_rate
  book_value = original_amount × original_rate
  difference → FX Gain or FX Loss
```

### 5.4 Supported Currencies

For cross-border e-commerce, typically:
```
USD, GBP, EUR, AUD, CAD, MXN, BRL, ARS, CLP, COP, UYU, CNY
```

Auto-fetch rates daily at UTC 08:00. Precision: 8 decimal places.

---

## 6. Trial Balance Check

The fundamental invariant that must always hold:

```sql
SELECT
  SUM(debit_amount) as total_debit,
  SUM(credit_amount) as total_credit
FROM journal_entry_lines jel
JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE je.tenant_id = ? AND je.status = 'posted';

-- total_debit MUST equal total_credit
```

This check should be:
1. Enforced at entry creation time (application level)
2. Run periodically as a background audit
3. Required before period close

---

## 7. Period Management

### 7.1 Period Status Flow

```
open → closing → closed
         ↓
       (reopen) → open  (admin-only, with audit log)
```

### 7.2 Month-End Close Process

```
1. Verify no draft entries in period
2. Run trial balance check
3. Calculate unrealized FX gain/loss → create adjustment entries
4. Calculate account balance snapshots (opening + period = closing)
5. Carry forward closing balances as next period's opening
6. Set period status = 'closed'
7. Log close event in audit trail
```

### 7.3 Rules

- Cannot create/modify entries in a closed period
- Reopening a closed period requires admin privilege and creates audit entry
- Auto-create future periods as needed (don't pre-create)

---

## 8. Profit Calculation Formula

### 8.1 Gross Profit

```
Gross Profit = Sales Revenue
             - COGS
             - Platform Commission
             - Shipping Cost
             - Refunds
```

### 8.2 Net Profit

```
Net Profit = Gross Profit
           - Advertising Expense
           - Storage & Warehouse Fees
           - FX Loss
           + FX Gain
           - Other Expenses
```

### 8.3 Per-SKU Profit

For multi-SKU orders, allocate shared costs proportionally:

```
SKU weight = SKU line total / order subtotal
SKU's share of platform fee = total platform fee × SKU weight
SKU's share of shipping = total shipping × SKU weight
SKU profit = SKU revenue - SKU COGS - SKU platform fee share - SKU shipping share
```

---

## 9. Audit Trail

Every accounting action must be logged in an append-only audit table:

```sql
CREATE TABLE accounting_audit_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,         -- journal_entry.created | .posted | .reversed | period.closed | period.reopened
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  user_id UUID,                        -- NULL for automated entries
  details JSONB,                       -- before/after state
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
