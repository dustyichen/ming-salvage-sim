#!/bin/bash
# 临时探针脚本：用 DeepSeek 跑 5 个 case 做 token/成本对比，跑完即可删除
export OPENAI_BASE_URL="https://api.deepseek.com"
export OPENAI_API_KEY="$deepseek_api_key"
export OPENAI_MODEL="deepseek-v4-flash"
export MING_SIM_DB="data/cov_deepseek_probe.db"
cd "$(dirname "$0")/.."
exec .venv/bin/python scripts/extractor_field_coverage.py --limit 5 --out docs/cov_deepseek_5.md
