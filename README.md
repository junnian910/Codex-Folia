# Codex Folia

将 Folia 原版播放器、歌词动画和动态背景接入 Windows 版 Codex，保留聊天操作。

本仓库仅提供完整源码。让你自己电脑上的 Codex 读取仓库并完成本地安装，运行环境和程序在本机准备。

## 让 Codex 安装到本机

把仓库地址和下面这段话发给你的 Codex：

> 请阅读这个仓库的 AGENTS.md 和 docs/INSTALLATION.md，从源码安装 Codex Folia 到本机。自动识别已安装的 Codex，复用本机 Node.js 24 和 npm；缺少环境时准备官方工具链。使用 Install-Local.ps1 安装到我选择的文件夹，并创建带 Folia 图标的桌面快捷方式。保留现有 Codex 窗口、账号、聊天记录和用户配置，不修改 WindowsApps 权限。AI 接口地址、模型和密钥留空供我填写。完成后检查快捷方式、图标、本地服务与 Codex 连接，说明实际结果；不要创建安装包或 Releases，不要上传检查报告和个人数据。

需要已安装的官方 Windows 版 Codex。你不必知道它的安装目录；Microsoft Store 版优先由 Windows 的应用启动接口打开。

Codex 会运行类似命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-Local.ps1 -InstallDirectory "D:\Program Files\Codex Folia"
```

Folia 与 Codex 可以安装在不同磁盘。首次安装需联网恢复依赖并构建播放器；本地安装不需要 NSIS。详细步骤见 [安装与启动](docs/INSTALLATION.md)。

## 桌面图标与启动

安装后使用桌面 **Codex Folia 背景**。图标来自程序目录内的 `folia.ico`，不会指向某个 Codex 版本的 EXE。

没有快捷方式时，在本机程序目录运行 `Repair-Shortcuts.cmd`。Store 版会自动使用 Windows 登记的应用入口；只有非标准的未打包版本才可能需要 `Select-Codex.cmd` 手动指定桌面程序。

启动失败会显示具体阶段，提示保存在使用者自己的 `%LOCALAPPDATA%\CodexFolia\launcher-error.log`。让本机 Codex 检查这个提示，不需要修改受保护安装目录的权限。

## AI 接口由使用者配置

开始菜单打开 **配置 AI**，填写自己的 OpenAI 兼容接口：

```json
"ai": {
  "baseUrl": "",
  "model": "",
  "apiKey": ""
}
```

三个字段默认均为空。配置保存在使用者自己的 `%LOCALAPPDATA%\CodexFolia\settings.json`；程序不读取 Codex 的 `.env`。未配置 AI 时仍可听歌、使用原生效果和内置主题。见 [AI 配置](docs/AI-CONFIGURATION.md)。

## 功能

- Folia 原版 14 种歌词效果、曲库、搜索、队列、主题及可用音效。
- 可移动、收起的原版播放器面板。
- 主歌词、翻译和和声独立移动、缩放、调节宽高及复原。
- 莫奈左歌词、右封面，翻译避开聊天输入框。
- 消息发送期间保持背景布局，可切换到完整播放器。
- 音乐和下载直连；缓存默认关闭，开启后的容量上限为 15 GB。

平台播放权限取决于使用者的账号与网络。原生 Electron 专用能力受嵌入环境限制。

## 源码结构

| 路径 | 内容 |
| --- | --- |
| `Install-Local.ps1` | 在本机准备程序并创建快捷方式 |
| `Build.ps1` | 播放器资源构建，支持仅准备本地程序 |
| `source/folia/` | 展开的 Folia 源码、嵌入修改及原版测试 |
| `app/` | 接入脚本、启动器、本地图标及空白配置样例 |
| `packaging/` | 运行环境准备、源码归档与历史打包工具 |
| `scripts/` | 本地检查和 Windows 集成测试 |
| `docs/` | 安装、AI 配置和源码发布说明 |

检查报告只保存在本地，由 `.gitignore` 排除。账号、密钥、登录、日志和缓存不进入源码仓库。见 [发布约定](docs/PUBLISHING.md)。

## 数据与更新

用户数据保存在程序目录之外。更新时保留用户设置与登录；本接入不改写 Codex 安装包。官方界面或调试接口改变后，接入仍可能需要适配。

## 许可

上游为 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major)，基线 0.7.19、提交 `a75748272c6dfa060edf4bbae709c49f0be8a68e`。Folia、本地图标和本接入修改按 AGPL-3.0 分发，见 [LICENSE](LICENSE)。第三方组件保留各自许可，见 `app/licenses/`。

这是独立社区接入项目。
