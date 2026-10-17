# Codex Folia

将 Folia 原版播放器、歌词动画和动态背景接入 Windows 版 Codex，保留聊天操作。

仓库包含完整源码和本地安装脚本，可由你电脑上的 Codex 完成安装。

## 让 Codex 安装到本机

把仓库地址和下面这段话发给你的 Codex：

> 请按照 docs/INSTALLATION.md 将 Codex Folia 安装到本机，自动识别已安装的 Codex，创建带 Folia 图标的桌面快捷方式，并启动验证背景和播放器。

需要已安装的官方 Windows 版 Codex。你不必知道它的安装目录；Microsoft Store 版优先由 Windows 的应用启动接口打开。

Codex 会运行类似命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-Local.ps1 -InstallDirectory "D:\Program Files\Codex Folia" -Start
```

Folia 与 Codex 可以安装在不同磁盘。首次安装由本机 Codex 完成依赖准备与播放器构建。详细步骤见 [安装与启动](docs/INSTALLATION.md)。

## 桌面图标与启动

安装后，双击桌面带 Folia 图标的 **Codex Folia 背景**，即可自动启动背景服务并打开带播放器的 Codex。图标来自程序目录内的 `folia.ico`，快捷方式直接调用启动脚本。

没有快捷方式时，在本机程序目录运行 `Repair-Shortcuts.cmd`。Store 版会自动使用 Windows 登记的应用入口；只有非标准的未打包版本才可能需要 `Select-Codex.cmd` 手动指定桌面程序。

启动失败会显示具体阶段，详细提示保存在 `%LOCALAPPDATA%\CodexFolia\launcher-error.log`，可交给本机 Codex 排查。

## AI 接口由使用者配置

开始菜单打开 **配置 AI**，填写自己的 OpenAI 兼容接口：

```json
"ai": {
  "baseUrl": "",
  "model": "",
  "apiKey": ""
}
```

三个字段默认均为空，配置保存在 `%LOCALAPPDATA%\CodexFolia\settings.json`。未配置 AI 时仍可听歌、使用原生效果和内置主题。见 [AI 配置](docs/AI-CONFIGURATION.md)。

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
| `docs/` | 安装与 AI 配置说明 |

## 数据与更新

用户数据保存在程序目录之外。更新时保留用户设置与登录；本接入不改写 Codex 安装包。官方界面或调试接口改变后，接入仍可能需要适配。

## 许可

上游为 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major)，基线 0.7.19、提交 `a75748272c6dfa060edf4bbae709c49f0be8a68e`。Folia、本地图标和本接入修改按 AGPL-3.0 分发，见 [LICENSE](LICENSE)。第三方组件保留各自许可，见 `app/licenses/`。

这是独立社区接入项目。
