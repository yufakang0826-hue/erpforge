#!/usr/bin/env bash
set -euo pipefail

# ─── 颜色定义 ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── 脚本所在目录（用于定位 templates/）──────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$PROJECT_ROOT/templates"

# ─── 模板类型映射 ──────────────────────────────────────────
declare -A TEMPLATE_MAP=(
  [backend-module]="backend/module-scaffold"
  [platform-engine]="backend/platform-engine"
  [list-page]="frontend/list-page"
  [detail-page]="frontend/detail-page"
  [dashboard-widget]="frontend/dashboard-widget"
)

# ─── 帮助信息 ──────────────────────────────────────────────
show_help() {
  cat <<EOF
${BOLD}ERPForge Scaffold Tool${NC}

用法:
  ./scripts/scaffold.sh <template-type> <module-name> [output-dir]
  ./scripts/scaffold.sh --list
  ./scripts/scaffold.sh --help

参数:
  template-type   模板类型（见下方列表）
  module-name     模块名称（小写，如 order, warehouse, product）
  output-dir      输出目录（可选，默认为当前目录）

模板类型:
  backend-module    后端模块脚手架（schema, service, routes, types, index）
  platform-engine   平台引擎模板（base-engine, api-client, oauth, field-mapper, sync-worker）
  list-page         前端列表页（page, filter-bar, columns, use-data）
  detail-page       前端详情页（page, form-schema）
  dashboard-widget  仪表盘组件（kpi-card, chart-card）

示例:
  ./scripts/scaffold.sh backend-module order ./src/modules/order
  ./scripts/scaffold.sh platform-engine walmart ./src/modules/walmart-engine
  ./scripts/scaffold.sh list-page order ./frontend/src/pages/order
  ./scripts/scaffold.sh detail-page order ./frontend/src/pages/order
  ./scripts/scaffold.sh dashboard-widget sales ./frontend/src/components/dashboard

选项:
  --help    显示此帮助信息
  --list    列出所有可用模板及其包含的文件
EOF
}

# ─── 列出模板 ──────────────────────────────────────────────
list_templates() {
  echo -e "${BOLD}可用模板:${NC}"
  echo ""
  for key in backend-module platform-engine list-page detail-page dashboard-widget; do
    local dir="${TEMPLATES_DIR}/${TEMPLATE_MAP[$key]}"
    echo -e "  ${CYAN}${key}${NC}"
    echo -e "    目录: templates/${TEMPLATE_MAP[$key]}/"
    if [[ -d "$dir" ]]; then
      echo "    文件:"
      for f in "$dir"/*; do
        [[ -f "$f" ]] && echo "      - $(basename "$f")"
      done
    fi
    echo ""
  done
}

# ─── 占位符替换函数 ──────────────────────────────────────────
# 将模块名转换为各种格式
to_pascal() {
  # order → Order, warehouse → Warehouse
  echo "${1^}"
}

to_upper() {
  # order → ORDER
  echo "${1^^}"
}

to_plural() {
  # 简单复数：加 s
  echo "${1}s"
}

replace_placeholders() {
  local content="$1"
  local module_lower="$2"
  local module_pascal module_upper module_plural

  module_pascal="$(to_pascal "$module_lower")"
  module_upper="$(to_upper "$module_lower")"
  module_plural="$(to_plural "$module_lower")"

  # 替换所有占位符变体
  content="${content//\{\{Module\}\}/$module_pascal}"
  content="${content//\{\{MODULE\}\}/$module_pascal}"
  content="${content//\{\{modules\}\}/$module_plural}"
  content="${content//\{\{module\}\}/$module_lower}"

  echo "$content"
}

replace_filename() {
  local filename="$1"
  local module_lower="$2"

  # 替换文件名中的占位符
  filename="${filename//\{\{module\}\}/$module_lower}"
  filename="${filename//\{\{Module\}\}/$(to_pascal "$module_lower")}"

  echo "$filename"
}

# ─── 主逻辑 ───────────────────────────────────────────────

# 处理选项
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  show_help
  exit 0
fi

if [[ "${1:-}" == "--list" ]] || [[ "${1:-}" == "-l" ]]; then
  list_templates
  exit 0
fi

# 验证参数
if [[ $# -lt 2 ]]; then
  echo -e "${RED}错误: 缺少必要参数${NC}"
  echo ""
  echo "用法: ./scripts/scaffold.sh <template-type> <module-name> [output-dir]"
  echo "运行 ./scripts/scaffold.sh --help 查看详细帮助"
  exit 1
fi

TEMPLATE_TYPE="$1"
MODULE_NAME="$2"
OUTPUT_DIR="${3:-.}"

# 验证模板类型
if [[ -z "${TEMPLATE_MAP[$TEMPLATE_TYPE]+x}" ]]; then
  echo -e "${RED}错误: 未知模板类型 '${TEMPLATE_TYPE}'${NC}"
  echo ""
  echo "可用模板类型:"
  for key in "${!TEMPLATE_MAP[@]}"; do
    echo "  - $key"
  done
  exit 1
fi

# 验证模块名称（只允许小写字母和连字符）
if ! [[ "$MODULE_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo -e "${RED}错误: 模块名称 '${MODULE_NAME}' 无效${NC}"
  echo "模块名称必须以小写字母开头，只能包含小写字母、数字和连字符"
  exit 1
fi

TEMPLATE_DIR="${TEMPLATES_DIR}/${TEMPLATE_MAP[$TEMPLATE_TYPE]}"

# 验证模板目录存在
if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo -e "${RED}错误: 模板目录不存在: ${TEMPLATE_DIR}${NC}"
  exit 1
fi

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

echo -e "${BOLD}ERPForge Scaffold${NC}"
echo -e "模板类型: ${CYAN}${TEMPLATE_TYPE}${NC}"
echo -e "模块名称: ${CYAN}${MODULE_NAME}${NC}"
echo -e "输出目录: ${CYAN}${OUTPUT_DIR}${NC}"
echo ""

# 记录创建的文件
CREATED_FILES=()
SKIPPED_FILES=()

# 遍历模板文件
for template_file in "$TEMPLATE_DIR"/*; do
  [[ -f "$template_file" ]] || continue

  filename="$(basename "$template_file")"

  # 跳过 README.md（模板说明文件）
  if [[ "$filename" == "README.md" ]]; then
    continue
  fi

  # 替换文件名中的占位符
  output_filename="$(replace_filename "$filename" "$MODULE_NAME")"
  output_path="${OUTPUT_DIR}/${output_filename}"

  # 检查文件是否已存在
  if [[ -f "$output_path" ]]; then
    echo -e "${YELLOW}跳过: ${output_filename}（文件已存在）${NC}"
    SKIPPED_FILES+=("$output_filename")
    continue
  fi

  # 读取模板内容并替换占位符
  content="$(cat "$template_file")"
  replaced_content="$(replace_placeholders "$content" "$MODULE_NAME")"

  # 写入文件
  echo "$replaced_content" > "$output_path"
  CREATED_FILES+=("$output_filename")
  echo -e "${GREEN}创建: ${output_filename}${NC}"
done

echo ""

# 汇总
if [[ ${#CREATED_FILES[@]} -gt 0 ]]; then
  echo -e "${GREEN}${BOLD}成功创建 ${#CREATED_FILES[@]} 个文件:${NC}"
  for f in "${CREATED_FILES[@]}"; do
    echo -e "  ${GREEN}✓${NC} ${OUTPUT_DIR}/${f}"
  done
fi

if [[ ${#SKIPPED_FILES[@]} -gt 0 ]]; then
  echo ""
  echo -e "${YELLOW}跳过 ${#SKIPPED_FILES[@]} 个已存在的文件:${NC}"
  for f in "${SKIPPED_FILES[@]}"; do
    echo -e "  ${YELLOW}•${NC} ${OUTPUT_DIR}/${f}"
  done
fi

if [[ ${#CREATED_FILES[@]} -eq 0 ]] && [[ ${#SKIPPED_FILES[@]} -gt 0 ]]; then
  echo ""
  echo -e "${YELLOW}所有文件已存在，未创建新文件${NC}"
fi

echo ""
echo -e "${BOLD}下一步:${NC}"
echo "  1. 根据业务需求修改生成的文件"
echo "  2. 运行 tsc --noEmit 检查类型"
echo "  3. 参考模板目录下的 README.md 了解自定义指南"
