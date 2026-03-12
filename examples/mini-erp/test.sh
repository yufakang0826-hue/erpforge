#!/usr/bin/env bash
# Mini ERP — 端到端测试脚本
# 用法: bash test.sh [BASE_URL]
#
# 演示完整业务流程：
#   产品 CRUD → 库存管理 → 订单生命周期 → 状态机校验 → 多租户隔离 → 取消释放库存 → 软删除

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
TENANT_A="a0000000-0000-0000-0000-000000000001"
TENANT_B="b0000000-0000-0000-0000-000000000002"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
step() { echo -e "\n${YELLOW}═══ $1 ═══${NC}"; }

PASSED=0

assert_pass() {
  pass "$1"
  PASSED=$((PASSED + 1))
}

# ─── Health Check ─────────────────────────────────
step "1. Health Check"

HEALTH=$(curl -sf "$BASE_URL/health")
echo "$HEALTH" | grep -q '"status":"ok"' && assert_pass "健康检查正常" || fail "健康检查失败"

# ─── Product CRUD ─────────────────────────────────
step "2. Product CRUD (Tenant A)"

# 创建产品
PRODUCT=$(curl -sf -X POST "$BASE_URL/api/products" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d '{"name":"Wireless Mouse","sku":"WM-TEST-001","price":"29.99","description":"蓝牙无线鼠标"}')
PRODUCT_ID=$(echo "$PRODUCT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$PRODUCT_ID" ] && assert_pass "创建产品: $PRODUCT_ID" || fail "创建产品失败"

# 查询产品
curl -sf "$BASE_URL/api/products/$PRODUCT_ID" \
  -H "X-Tenant-ID: $TENANT_A" | grep -q "Wireless Mouse" \
  && assert_pass "查询产品" || fail "查询产品失败"

# 更新产品
curl -sf -X PATCH "$BASE_URL/api/products/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d '{"price":"24.99"}' | grep -q "24.99" \
  && assert_pass "更新产品价格 → 24.99" || fail "更新产品价格失败"

# 产品列表
LIST=$(curl -sf "$BASE_URL/api/products" -H "X-Tenant-ID: $TENANT_A")
echo "$LIST" | grep -q "Wireless Mouse" && assert_pass "产品列表包含新产品" || fail "产品列表缺少新产品"

# ─── Inventory Management ─────────────────────────
step "3. Inventory Management"

# 初始化库存
INIT_INV=$(curl -sf -X POST "$BASE_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"sku\":\"WM-TEST-001\",\"quantity\":100}")
echo "$INIT_INV" | grep -q '"quantity":100' && assert_pass "初始化库存: 100" || fail "初始化库存失败"

# 调整库存（+50）
ADJ_INV=$(curl -sf -X PATCH "$BASE_URL/api/inventory/$PRODUCT_ID/adjust" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d '{"quantity":50,"reason":"补货到仓"}')
echo "$ADJ_INV" | grep -q '"quantity":150' && assert_pass "库存调整: +50 → 150" || fail "库存调整失败"

# ─── Order Lifecycle ──────────────────────────────
step "4. Order Lifecycle (State Machine)"

# 创建订单（自动预扣库存）
ORDER=$(curl -sf -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d "{\"buyerName\":\"张三\",\"buyerEmail\":\"zhang@test.com\",\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}]}")
ORDER_ID=$(echo "$ORDER" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$ORDER_ID" ] && assert_pass "创建订单: $ORDER_ID (status: pending_review)" || fail "创建订单失败"

# 验证库存预扣
INVENTORY=$(curl -sf "$BASE_URL/api/inventory/$PRODUCT_ID" -H "X-Tenant-ID: $TENANT_A")
echo "$INVENTORY" | grep -q '"reservedQuantity":2' && assert_pass "库存预扣: reservedQuantity=2" || fail "库存预扣验证失败"

# 合法状态转换: pending_review → approved → processing → shipped → delivered → completed
for STATUS in approved processing shipped delivered completed; do
  RESULT=$(curl -sf -X PATCH "$BASE_URL/api/orders/$ORDER_ID/status" \
    -H "Content-Type: application/json" \
    -H "X-Tenant-ID: $TENANT_A" \
    -d "{\"status\":\"$STATUS\"}")
  echo "$RESULT" | grep -q "\"status\":\"$STATUS\"" \
    && assert_pass "状态转换 → $STATUS" || fail "状态转换 → $STATUS 失败"
done

# ─── Illegal Transition ──────────────────────────
step "5. Illegal State Transition"

# completed → pending_review（应该被拒绝，返回 422）
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d '{"status":"pending_review"}')
[ "$HTTP_CODE" = "422" ] && assert_pass "非法转换被拒绝 (HTTP 422)" || fail "非法转换应返回 422，实际: $HTTP_CODE"

# ─── Multi-Tenant Isolation ──────────────────────
step "6. Multi-Tenant Isolation"

# Tenant B 不应看到 Tenant A 的产品
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/products/$PRODUCT_ID" \
  -H "X-Tenant-ID: $TENANT_B")
[ "$HTTP_CODE" = "404" ] && assert_pass "Tenant B 无法访问 Tenant A 的产品 (HTTP 404)" || fail "租户隔离失败 (产品): $HTTP_CODE"

# Tenant B 不应看到 Tenant A 的订单
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/orders/$ORDER_ID" \
  -H "X-Tenant-ID: $TENANT_B")
[ "$HTTP_CODE" = "404" ] && assert_pass "Tenant B 无法访问 Tenant A 的订单 (HTTP 404)" || fail "租户隔离失败 (订单): $HTTP_CODE"

# ─── Cancellation + Inventory Release ────────────
step "7. Order Cancellation (Inventory Release)"

# 创建新订单（预扣 5 件）
ORDER2=$(curl -sf -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d "{\"buyerName\":\"李四\",\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":5}]}")
ORDER2_ID=$(echo "$ORDER2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$ORDER2_ID" ] && assert_pass "创建订单2: $ORDER2_ID" || fail "创建订单2失败"

# 验证预扣增加
INV_BEFORE=$(curl -sf "$BASE_URL/api/inventory/$PRODUCT_ID" -H "X-Tenant-ID: $TENANT_A")
echo "$INV_BEFORE" | grep -q '"reservedQuantity":5' && assert_pass "库存预扣: reservedQuantity=5" || fail "库存预扣验证失败"

# 取消订单
CANCEL_RESULT=$(curl -sf -X PATCH "$BASE_URL/api/orders/$ORDER2_ID/status" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_A" \
  -d '{"status":"cancelled"}')
echo "$CANCEL_RESULT" | grep -q '"status":"cancelled"' && assert_pass "取消订单" || fail "取消订单失败"

# 验证库存释放（reservedQuantity 应回到 0）
FINAL_INV=$(curl -sf "$BASE_URL/api/inventory/$PRODUCT_ID" -H "X-Tenant-ID: $TENANT_A")
echo "$FINAL_INV" | grep -q '"reservedQuantity":0' && assert_pass "库存已释放: reservedQuantity=0" || fail "库存释放验证失败"

# ─── Soft Delete ──────────────────────────────────
step "8. Soft Delete"

# 软删除产品
DEL_RESULT=$(curl -sf -X DELETE "$BASE_URL/api/products/$PRODUCT_ID" \
  -H "X-Tenant-ID: $TENANT_A")
echo "$DEL_RESULT" | grep -q '"isDeleted":true' && assert_pass "产品软删除" || fail "产品软删除失败"

# 列表中不应出现已删除产品
LIST_AFTER=$(curl -sf "$BASE_URL/api/products" -H "X-Tenant-ID: $TENANT_A")
if echo "$LIST_AFTER" | grep -q "$PRODUCT_ID"; then
  fail "软删除过滤失败：已删除产品仍在列表中"
else
  assert_pass "已删除产品不在列表中"
fi

# ─── 缺少 Tenant Header ──────────────────────────
step "9. Missing Tenant Header"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/products")
[ "$HTTP_CODE" = "400" ] && assert_pass "缺少 X-Tenant-ID 返回 400" || fail "缺少租户头应返回 400，实际: $HTTP_CODE"

# ─── Summary ──────────────────────────────────────
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  All $PASSED tests passed!${NC}"
echo -e "${GREEN}  Mini ERP is working correctly.${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
