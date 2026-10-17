# Codex Folia

安装方法见源码仓库的 `docs/INSTALLATION.md`。根目录 `Install-Local.ps1` 会准备程序并创建快捷方式。

双击桌面带 Folia 图标的 **Codex Folia 背景**，即可自动启动背景服务并连接 Codex，显示播放器。图标由程序目录的 `folia.ico` 提供。快捷方式缺失时运行 `Repair-Shortcuts.cmd`。

Folia 与 Codex 可以安装在不同磁盘。Store 版通过 Windows 登记的应用入口自动启动，非标准未打包版本可通过 `Select-Codex.cmd` 选择入口。

AI 地址、模型和密钥默认留空。开始菜单 **配置 AI** 可打开配置文件，填写后关闭背景并重新打开。

用户设置与登录保存在 `%LOCALAPPDATA%\CodexFolia`，独立于程序目录。启动错误的详细提示位于其中的 `launcher-error.log`。

保留 Folia 原版播放器和 14 种歌词效果；歌词、翻译及和声可分别移动、缩放和调整宽高。音乐与下载直连，歌曲缓存默认关闭，开启后的上限为 15 GB。

Folia、本地图标及本接入修改按 AGPL-3.0 分发，见 `LICENSE-Folia`，第三方许可见 `licenses/`。
