# Codex Folia

将 Folia 的原版播放器、歌词动画和动态背景嵌入 Windows 版 Codex，保留聊天操作。

## 安装使用

安装程序适用于 Windows x64，需要已安装官方 Codex。运行安装器后，从桌面 **Codex Folia 背景** 打开，并登录自己的 Codex 和音乐账号。安装器自带 Node.js，使用者无需安装开发环境。

安装包作为 GitHub Releases 附件发布。此仓库保存展开的全部应用源码和构建脚本，运行环境、依赖和构建产物通过脚本准备。

## AI 接口由使用者配置

开始菜单打开 **配置 AI**，填写自己使用的 OpenAI 兼容接口：

```json
{
  "cdpPort": 9338,
  "webPort": 32110,
  "cacheDirectory": "",
  "ai": {
    "baseUrl": "",
    "model": "",
    "apiKey": ""
  }
}
```

`baseUrl` 为接口地址，`model` 为服务商提供的模型名称，`apiKey` 为使用者自己的密钥。填写后关闭背景，再重新打开。

三个 AI 字段默认均为空。听歌、歌词效果和内置主题可直接使用；AI 主题在配置完成后启用。实际配置写入使用者自己的 `%LOCALAPPDATA%\CodexFolia\settings.json`，应用不会读取 Codex 的 `.env` 或代用其他应用的密钥。

## 功能

- Folia 原版 14 种效果、曲库、搜索、队列、主题和可用音效。
- 可移动、可收起的右侧原版播放器面板。
- 主歌词、翻译和和声独立移动、缩放及调节宽高，支持复原。
- 莫奈左侧歌词、右侧封面；翻译在前景显示并避开聊天输入框。
- 消息发送期间保持背景布局；可切换到完整播放器。
- 音乐及下载直接连接；歌曲缓存默认关闭，容量上限为 15 GB。

播放权限和音乐平台功能取决于使用者自己的账号与网络。原生 Electron 专用能力受嵌入 Web 环境限制。

## 项目结构

| 目录 | 内容 |
| --- | --- |
| `source/folia/` | 展开的完整 Folia 源码、嵌入修改、测试及构建配置 |
| `app/` | 接入层源码、启动器、本地后端与空白配置样例 |
| `packaging/` | Windows NSIS 安装器、运行环境准备和源码归档脚本 |
| `scripts/` | GitHub 上传候选文件的隐私与体积检查 |
| `docs/` | AI 配置及发布说明 |

上游为 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major)，基线版本 0.7.19，提交 `a75748272c6dfa060edf4bbae709c49f0be8a68e`。上游 Git 历史未复制进本仓库。

## 从源码构建

开发环境需要 Windows x64、Node.js 24、npm 和 NSIS 3。首次恢复依赖需要网络。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1 -NsisPath "NSIS目录\makensis.exe"
```

脚本恢复应用和接入层依赖，生成两种播放器资源、对应源码归档及 Windows 安装器。安装器使用固定版本的 Node.js 24.18.0；若本机已有同版本就复用，否则从 Node.js 官方站点下载并验证归档校验码。输出在 `dist/`。

```powershell
node .\scripts\check-public.mjs
```

此命令检查待提交源码中的敏感文件、常见凭据、AI 默认值和 GitHub 文件体积限制。`--check-local` 还会在本机内存中比对本地用户名、全局 Git 身份和 Codex `.env` 中的凭据。生成的检查报告仅保存在本地，已由 `.gitignore` 排除，不提交到仓库或作为发布附件。

## 数据、更新与发布

使用者的登录、设置、日志和缓存保存在安装目录外。程序卸载保留使用者的数据。本接入不改写 Codex 安装包；官方界面或调试接口变化后可能需要适配。

上传前检查见 [发布说明](docs/PUBLISHING.md)。源码、许可证和匿名项目提交身份已准备好；GitHub 上的发布账号和仓库名称由发布者选择。公开仓库会显示发布账号。

## 许可

Folia 和本接入修改按 AGPL-3.0 分发，见 [LICENSE](LICENSE)。Node.js、音乐后端依赖和其他第三方组件保留各自许可，见 `app/licenses/` 及依赖包中的许可文件。发布时保留完整对应源码与许可。

这是独立社区接入项目。
