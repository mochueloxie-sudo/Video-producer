#!/usr/bin/env node
/**
 * Tool Locator v3.0 - 完全自动发现
 * 核心改进：不再需要手动维护 TOOLS 列表
 * 策略：基于工具用途分组 + 常见命令名 + 智能扫描
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class ToolLocator {
  constructor() {
    this.configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.slide-forge');
    this.configFile = path.join(this.configDir, 'tools.json');
    this.historyFile = path.join(this.configDir, 'install-history.json');
    this.cache = {};
    this.loadConfig();
    this.loadHistory();
  }

  loadConfig() {
    try {
      this.config = fs.existsSync(this.configFile)
        ? JSON.parse(fs.readFileSync(this.configFile, 'utf-8'))
        : {};
    } catch (e) {
      console.error(`⚠️ 配置加载失败: ${e.message}`);
      this.config = {};
    }
  }

  loadHistory() {
    try {
      this.history = fs.existsSync(this.historyFile)
        ? JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'))
        : {};
    } catch (e) {
      this.history = {};
    }
  }

  saveConfig() {
    fs.mkdirSync(this.configDir, { recursive: true });
    fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
  }

  saveHistory() {
    fs.mkdirSync(this.configDir, { recursive: true });
    fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
  }

  recordInstallation(toolKey, path, source = 'auto-scan') {
    this.history[toolKey] = {
      path,
      discoveredAt: new Date().toISOString(),
      source,
      method: 'auto-discovery'
    };
    this.saveHistory();
  }

  /**
   * 工具定义：用途分组 + 命令名模式
   * 新增工具只需在此数组添加一项
   */
  getToolDefinitions() {
    return [
      // 核心工具（slide-forge 依赖）
      {
        key: 'ffmpeg',
        names: ['ffmpeg'],
        category: 'video',
        required: true,
        testArgs: ['-version'],
        hint: 'brew install ffmpeg 或下载 https://evermeet.cx/ffmpeg/'
      },
      {
        key: 'ffprobe',
        names: ['ffprobe'],
        category: 'video',
        required: true,
        testArgs: ['-version'],
        hint: '通常与 ffmpeg 捆绑（同一目录）'
      },
      {
        key: 'imagemagick',
        names: ['convert', 'magick'],
        category: 'image',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install imagemagick'
      },
      {
        key: 'identify',
        names: ['identify'],
        category: 'image',
        required: false,
        testArgs: ['--version'],
        hint: '通常与 imagemagick 捆绑'
      },
      {
        key: 'larkCli',
        names: ['lark-cli', 'lark'],
        category: 'cloud',
        required: false,
        testArgs: ['--help'],
        hint: 'npm install -g @larksuite/cli'
      },
      // 可选增强工具
      {
        key: 'jq',
        names: ['jq'],
        category: 'util',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install jq'
      },
      {
        key: 'gh',
        names: ['gh'],
        category: 'cloud',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install gh'
      },
      {
        key: 'git',
        names: ['git'],
        category: 'dev',
        required: false,
        testArgs: ['--version'],
        hint: 'Xcode Command Line Tools 或 brew install git'
      },
      {
        key: 'ripgrep',
        names: ['rg'],
        category: 'dev',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install ripgrep'
      },
      {
        key: 'tree',
        names: ['tree'],
        category: 'dev',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install tree'
      },
      {
        key: 'mas',
        names: ['mas'],
        category: 'util',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install mas'
      },
      // 额外常用工具（2026-04-07 补充）
      {
        key: 'htop',
        names: ['htop'],
        category: 'sys',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install htop'
      },
      {
        key: 'tmux',
        names: ['tmux'],
        category: 'sys',
        required: false,
        testArgs: ['-V'],
        hint: 'brew install tmux'
      },
      {
        key: 'wget',
        names: ['wget'],
        category: 'net',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install wget'
      },
      {
        key: 'openssl',
        names: ['openssl'],
        category: 'security',
        required: false,
        testArgs: ['version'],
        hint: 'brew install openssl'
      },
      {
        key: 'lz4',
        names: ['lz4'],
        category: 'compression',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install lz4'
      },
      {
        key: 'xz',
        names: ['xz'],
        category: 'compression',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install xz'
      },
      {
        key: 'zstd',
        names: ['zstd'],
        category: 'compression',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install zstd'
      },
      // ImageMagick 子工具
      {
        key: 'magick',
        names: ['magick'],
        category: 'image',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install imagemagick'
      },
      {
        key: 'mogrify',
        names: ['mogrify'],
        category: 'image',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install imagemagick'
      },
      {
        key: 'montage',
        names: ['montage'],
        category: 'image',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install imagemagick'
      },
      {
        key: 'compare',
        names: ['compare'],
        category: 'image',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install imagemagick'
      },
      // FFmpeg 子工具
      {
        key: 'ffplay',
        names: ['ffplay'],
        category: 'video',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install ffmpeg'
      },
      // Gettext 工具
      {
        key: 'gettext',
        names: ['gettext'],
        category: 'i18n',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install gettext'
      },
      {
        key: 'msgfmt',
        names: ['msgfmt'],
        category: 'i18n',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install gettext'
      },
      {
        key: 'watch',
        names: ['watch'],
        category: 'sys',
        required: false,
        testArgs: ['--version'],
        hint: 'brew install procps-ng 或 Linux 系统自带'
      }
    ];
  }

  /**
   * 获取搜索路径列表
   */
  getSearchPaths() {
    const home = process.env.HOME || process.env.USERPROFILE;
    return [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      path.join(home, 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(home, '.npm', 'global', 'bin'),
      path.join(home, '.nvm', 'versions', 'node'),
      '/opt/local/bin',
      '/opt/bin',
      '/sbin',
      '/usr/sbin'
    ];
  }

  /**
   * 在 PATH 中查找命令
   */
  findInPath(cmd) {
    const pathEnv = process.env.PATH || '';
    for (const dir of pathEnv.split(path.delimiter)) {
      const full = path.join(dir, cmd);
      if (fs.existsSync(full)) return full;
    }
    return null;
  }

  /**
   * 验证二进制文件是否可执行
   * 某些工具（如 ffplay）将版本输出到 stderr 且返回非零，需要特殊处理
   */
  validateBinary(binPath, testArgs) {
    try {
      const result = spawnSync(binPath, testArgs || ['--version'], { stdio: 'pipe' });
      // 合并 stdout 和 stderr，某些工具版本信息输出到 stderr
      const output = Buffer.concat([result.stdout, result.stderr]).toString();
      return result.status === 0 || output.length > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * 扫描系统查找工具
   */
  scanForTool(toolDef) {
    // 1. 环境变量（最高优先级）
    const envVar = toolDef.key.toUpperCase() + '_PATH';
    const envPath = process.env[envVar];
    if (envPath && fs.existsSync(envPath) && this.validateBinary(envPath, toolDef.testArgs)) {
      return { path: envPath, source: 'env-var' };
    }

    // 2. 用户配置（高优先级）
    if (this.config[toolDef.key] && fs.existsSync(this.config[toolDef.key])) {
      return { path: this.config[toolDef.key], source: 'config' };
    }

    // 3. 常见路径扫描（中优先级）
    const searchPaths = this.getSearchPaths();
    for (const dir of searchPaths) {
      for (const name of toolDef.names) {
        const fullPath = path.join(dir, name);
        if (fs.existsSync(fullPath) && this.validateBinary(fullPath, toolDef.testArgs)) {
          return { path: fullPath, source: 'filesystem' };
        }
      }
    }

    // 4. PATH 搜索（低优先级）
    for (const name of toolDef.names) {
      const found = this.findInPath(name);
      if (found) return { path: found, source: 'path' };
    }

    return null;
  }

  /**
   * 查找工具（带缓存）
   */
  find(toolKey) {
    if (this.cache[toolKey]) {
      return this.cache[toolKey];
    }

    const toolDef = this.getToolDefinitions().find(t => t.key === toolKey);
    if (!toolDef) {
      console.warn(`⚠️  未知工具: ${toolKey}`);
      return null;
    }

    const found = this.scanForTool(toolDef);
    if (found) {
      this.cache[toolKey] = found.path;
      this.config[toolKey] = found.path;
      this.recordInstallation(toolKey, found.path, found.source);
      this.saveConfig();
      return found.path;
    }

    if (toolDef.required) {
      throw new Error(`必需工具未找到: ${toolDef.names[0]} (${toolKey})\n💡 提示: ${toolDef.hint}`);
    }
    return null;
  }

  /**
   * 批量检查所有工具状态
   */
  async status() {
    const status = {};
    for (const toolDef of this.getToolDefinitions()) {
      const path = this.find(toolDef.key);
      const available = path ? this.validateBinary(path, toolDef.testArgs) : false;
      status[toolDef.key] = {
        name: toolDef.names[0],
        path: path || null,
        available,
        required: toolDef.required,
        category: toolDef.category,
        hint: toolDef.hint
      };
    }
    return status;
  }

  /**
   * 同步扫描并更新配置（补充缺失项）
   */
  sync() {
    console.log('🔍 扫描系统工具...');
    let updated = false;

    for (const toolDef of this.getToolDefinitions()) {
      if (this.config[toolDef.key]) continue; // 已有配置则跳过

      const found = this.scanForTool(toolDef);
      if (found) {
        this.config[toolDef.key] = found.path;
        this.recordInstallation(toolDef.key, found.path, found.source);
        console.log(`  ✅ ${toolDef.key}: ${found.path} (${found.source})`);
        updated = true;
      }
    }

    if (updated) {
      this.saveConfig();
      console.log('💾 配置已更新');
    } else {
      console.log('✅ 无需更新，所有已安装工具已记录');
    }

    return updated;
  }

  /**
   * 交互式配置（备用）
   */
  static configure() {
    console.log('⚙️  工具配置向导（暂未实现，请直接编辑 ~/.slide-forge/tools.json）');
  }
}

// 单例
let instance = null;
function getLocator() {
  if (!instance) {
    instance = new ToolLocator();
  }
  return instance;
}

module.exports = { ToolLocator, getLocator };
