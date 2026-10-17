# Codex Folia

本目录提供播放器接入脚本。由本机 Codex 阅读源码仓库的 `AGENTS.md` 和 `docs/INSTALLATION.md`，运行根目录 `Install-Local.ps1` 安装到使用者选择的程序目录。

安装完成后使用桌面 **Codex Folia 背景**。程序目录中的 `folia.ico` 提供独立的 Folia 图标，不依赖 Codex 版本路径。快捷方式缺失时运行 `Repair-Shortcuts.cmd`。

Folia 与 Codex 可以安装在不同磁盘。Store 版优先通过 Windows 登记的应用启动接口打开，不需要使用者知道 EXE 位置。非标准的未打包版本可用 `Select-Codex.cmd` 补充路径。

AI 地址、模型和密钥默认留空。开始菜单 **配置 AI** 会打开使用者自己的配置，填写后关闭背景并重新打开。程序不读取 Codex 的 `.env`。

用户登录、配置、日志和缓存保存在 `%LOCALAPPDATA%\CodexFolia`，独立于程序目录。启动错误包含失败阶段，具体提示位于其中的 `launcher-error.log`。

保留 Folia 原版播放器和 14 种歌词效果；歌词、翻译及和声可分别移动、缩放及调整宽高。音乐与下载直连，歌曲缓存默认关闭，开启后的上限为 15 GB。

本项目仅发布源码，不提供安装包或 Releases；检查报告与校验文件仅留本机。Folia、本地图标及本接入修改按 AGPL-3.0 分发，见 `LICENSE-Folia`，第三方许可见 `licenses/`。
