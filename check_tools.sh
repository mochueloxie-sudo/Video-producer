#!/bin/bash
# 工具诊断脚本：检查 slide-forge 依赖的外部工具

echo "🔧 Video-Producer 工具诊断"
echo "================================"
echo ""

# 加载 tool locator
TOOL_LOCATOR="$HOME/.openclaw/workspace/skills/slide-forge/steps/utils/tool-locator.js"

if [ ! -f "$TOOL_LOCATOR" ]; then
  echo "❌ 未找到 tool-locator.js"
  exit 1
fi

echo "📋 检查工具状态："
echo ""

# 使用 Node 调用 tool locator
node -e "
const { getLocator } = require('$TOOL_LOCATOR');
const locator = getLocator();

(async () => {
  const status = await locator.status();
  console.log('工具\t\t状态\t路径');
  console.log('----\t\t----\t----');
  for (const [key, info] of Object.entries(status)) {
    const icon = info.available ? '✅' : (info.required ? '❌' : '⚠️ ');
    const pathStr = info.path || '未找到';
    console.log(\`\${key}\t\t\${icon}\t\${pathStr}\`);
  }
  console.log('');
  console.log('配置文件: ' + locator.configFile);
  
  // 缺失的必需工具
  const missingRequired = Object.entries(status)
    .filter(([k, v]) => v.required && !v.available);
  if (missingRequired.length > 0) {
    console.log('');
    console.log('❌ 缺失必需工具：');
    missingRequired.forEach(([k, v]) => {
      console.log(\`   - \${v.name}: 设置环境变量 \${v.envVar} 或编辑配置文件\`);
    });
    process.exit(1);
  } else {
    console.log('✅ 所有必需工具已就绪');
  }
})();
"

echo ""
echo "💡 配置方法："
echo "1. 编辑配置文件: $HOME/.slide-forge/tools.json"
echo "2. 或设置环境变量（如 export FFMPEG_PATH=/path/to/ffmpeg）"
echo "3. 运行交互式配置: node -e \"require('./steps/utils/tool-locator').ToolLocator.configure()\""
echo ""
