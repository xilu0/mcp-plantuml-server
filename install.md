# MCP PlantUML Server 安装指南

## 方法1: 直接克隆配置

### 1. 克隆仓库
```bash
# 选择一个合适的目录存放MCP服务器
cd ~/mcp-servers  # 或其他你喜欢的目录
git clone https://github.com/xilu0/mcp-plantuml-server.git
cd mcp-plantuml-server
npm install
```

### 2. 配置 Claude Desktop

编辑 Claude Desktop 配置文件：

**macOS/Linux:**
```json
{
  "mcpServers": {
    "plantuml": {
      "command": "node",
      "args": ["~/mcp-servers/mcp-plantuml-server/index.js"]
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "plantuml": {
      "command": "node",
      "args": ["C:\\Users\\YourName\\mcp-servers\\mcp-plantuml-server\\index.js"]
    }
  }
}
```

## 方法2: 使用 npx 直接运行（推荐）

### 1. 发布到 npm（仓库所有者操作）

在你的仓库中添加以下配置：

**package.json:**
```json
{
  "name": "@xilu0/mcp-plantuml-server",
  "version": "1.0.0",
  "description": "MCP server for rendering PlantUML diagrams",
  "main": "index.js",
  "bin": {
    "mcp-plantuml": "./bin/mcp-plantuml.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/xilu0/mcp-plantuml-server.git"
  },
  "keywords": ["mcp", "plantuml", "diagram"],
  "author": "xilu0",
  "license": "MIT"
}
```

**bin/mcp-plantuml.js:**
```javascript
#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '..', 'index.js');

// 动态导入服务器
import(serverPath);
```

### 2. 用户配置 Claude Desktop

使用 npx 直接运行：
```json
{
  "mcpServers": {
    "plantuml": {
      "command": "npx",
      "args": ["@xilu0/mcp-plantuml-server"]
    }
  }
}
```

## 方法3: 自动安装脚本

创建一个安装脚本 `install.sh` (Unix) 和 `install.ps1` (Windows)：

### install.sh (macOS/Linux)
```bash
#!/bin/bash

# 设置安装目录
MCP_DIR="$HOME/.mcp-servers"
SERVER_NAME="mcp-plantuml-server"
REPO_URL="https://github.com/xilu0/mcp-plantuml-server.git"

# 创建目录
mkdir -p "$MCP_DIR"

# 克隆或更新仓库
if [ -d "$MCP_DIR/$SERVER_NAME" ]; then
    echo "Updating $SERVER_NAME..."
    cd "$MCP_DIR/$SERVER_NAME"
    git pull
else
    echo "Installing $SERVER_NAME..."
    cd "$MCP_DIR"
    git clone "$REPO_URL" "$SERVER_NAME"
    cd "$SERVER_NAME"
fi

# 安装依赖
echo "Installing dependencies..."
npm install

# 检测 Claude Desktop 配置文件位置
if [ "$(uname)" == "Darwin" ]; then
    CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
else
    CONFIG_FILE="$HOME/.config/Claude/claude_desktop_config.json"
fi

# 创建配置目录（如果不存在）
mkdir -p "$(dirname "$CONFIG_FILE")"

# 更新配置文件
echo "Updating Claude Desktop configuration..."
if [ ! -f "$CONFIG_FILE" ]; then
    echo '{"mcpServers":{}}' > "$CONFIG_FILE"
fi

# 使用 Node.js 更新 JSON 配置
node -e "
const fs = require('fs');
const configPath = '$CONFIG_FILE';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.mcpServers = config.mcpServers || {};
config.mcpServers.plantuml = {
    command: 'node',
    args: ['$MCP_DIR/$SERVER_NAME/index.js']
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Configuration updated successfully!');
"

echo "Installation complete! Please restart Claude Desktop."
```

### install.ps1 (Windows)
```powershell
# 设置安装目录
$MCP_DIR = "$env:USERPROFILE\.mcp-servers"
$SERVER_NAME = "mcp-plantuml-server"
$REPO_URL = "https://github.com/xilu0/mcp-plantuml-server.git"

# 创建目录
New-Item -ItemType Directory -Force -Path $MCP_DIR | Out-Null

# 克隆或更新仓库
$SERVER_PATH = Join-Path $MCP_DIR $SERVER_NAME
if (Test-Path $SERVER_PATH) {
    Write-Host "Updating $SERVER_NAME..."
    Set-Location $SERVER_PATH
    git pull
} else {
    Write-Host "Installing $SERVER_NAME..."
    Set-Location $MCP_DIR
    git clone $REPO_URL $SERVER_NAME
    Set-Location $SERVER_PATH
}

# 安装依赖
Write-Host "Installing dependencies..."
npm install

# Claude Desktop 配置文件路径
$CONFIG_FILE = "$env:APPDATA\Claude\claude_desktop_config.json"

# 创建配置目录（如果不存在）
$CONFIG_DIR = Split-Path $CONFIG_FILE -Parent
New-Item -ItemType Directory -Force -Path $CONFIG_DIR | Out-Null

# 更新配置文件
Write-Host "Updating Claude Desktop configuration..."
if (!(Test-Path $CONFIG_FILE)) {
    '{"mcpServers":{}}' | Out-File -FilePath $CONFIG_FILE -Encoding UTF8
}

# 更新 JSON 配置
$config = Get-Content $CONFIG_FILE | ConvertFrom-Json
if ($null -eq $config.mcpServers) {
    $config | Add-Member -NotePropertyName mcpServers -NotePropertyValue @{} -Force
}
$config.mcpServers.plantuml = @{
    command = "node"
    args = @("$SERVER_PATH\index.js")
}
$config | ConvertTo-Json -Depth 10 | Out-File -FilePath $CONFIG_FILE -Encoding UTF8

Write-Host "Installation complete! Please restart Claude Desktop."
```

## 方法4: 一键安装命令

### Unix/Linux/macOS:
```bash
curl -sSL https://raw.githubusercontent.com/xilu0/mcp-plantuml-server/main/install.sh | bash
```

### Windows (PowerShell):
```powershell
irm https://raw.githubusercontent.com/xilu0/mcp-plantuml-server/main/install.ps1 | iex
```

## 方法5: 使用 Git 子模块（适合开发者）

如果用户有自己的 MCP 服务器集合仓库：

```bash
# 在你的 MCP 集合仓库中
git submodule add https://github.com/xilu0/mcp-plantuml-server.git servers/plantuml
git submodule update --init --recursive

# Claude Desktop 配置
{
  "mcpServers": {
    "plantuml": {
      "command": "node",
      "args": ["~/my-mcp-collection/servers/plantuml/index.js"]
    }
  }
}
```

## 更新服务器

### 手动更新：
```bash
cd ~/mcp-servers/mcp-plantuml-server
git pull
npm install
```

### 自动更新脚本 update.sh：
```bash
#!/bin/bash
MCP_DIR="$HOME/.mcp-servers"
for server in "$MCP_DIR"/*; do
    if [ -d "$server/.git" ]; then
        echo "Updating $(basename $server)..."
        cd "$server"
        git pull
        npm install
    fi
done
```

## README.md 建议内容

为你的仓库添加清晰的安装说明：

```markdown
# MCP PlantUML Server

将 PlantUML 文本渲染为图像的 MCP 服务器。

## 快速安装

### 选项 1: 自动安装（推荐）

**macOS/Linux:**
```bash
curl -sSL https://raw.githubusercontent.com/xilu0/mcp-plantuml-server/main/install.sh | bash
```

**Windows PowerShell:**
```powershell
irm https://raw.githubusercontent.com/xilu0/mcp-plantuml-server/main/install.ps1 | iex
```

### 选项 2: 手动安装

1. 克隆仓库：
```bash
git clone https://github.com/xilu0/mcp-plantuml-server.git
cd mcp-plantuml-server
npm install
```

2. 配置 Claude Desktop：

编辑配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

添加：
```json
{
  "mcpServers": {
    "plantuml": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-plantuml-server/index.js"]
    }
  }
}
```

3. 重启 Claude Desktop

## 系统要求

- Node.js 16+
- Java Runtime Environment (JRE)
- Graphviz

### 安装依赖：

**macOS:**
```bash
brew install openjdk graphviz
```

**Ubuntu/Debian:**
```bash
sudo apt-get install default-jre graphviz
```

**Windows:**
- [Java](https://www.java.com/download/)
- [Graphviz](https://graphviz.org/download/)

## 使用方法

在 Claude 中使用以下命令：

1. 渲染 PlantUML 图表
2. 验证 PlantUML 语法
3. 从文件渲染图表

## 更新

```bash
cd /path/to/mcp-plantuml-server
git pull
npm install
```

## License

MIT
```