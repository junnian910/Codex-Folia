# 通过本机 Codex 从源码安装

将仓库地址发给已安装的 Windows 版 Codex，让它先阅读根目录 `AGENTS.md`，然后完成以下步骤。

1. 检查 Windows、已有 Codex、Node.js 24 和 npm，复用本机环境。缺少开发环境时由 Codex 准备官方工具链。
2. 选择一个独立的可写程序目录，例如 `D:\Program Files\Codex Folia`。不要求与 Codex 同盘，不使用源码目录作为程序目录。
3. 运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-Local.ps1 -InstallDirectory "D:\Program Files\Codex Folia"`。脚本恢复依赖、构建播放器、复制运行文件、创建快捷方式；不生成安装器，不需要 NSIS。
4. 检查桌面 **Codex Folia 背景** 与程序目录的 `folia.ico`，确认快捷方式的启动目录和脚本路径正确。
5. 使用桌面入口启动，检查本地服务和 Codex 连接。Store 版通过 Windows 应用启动接口打开，无需查找受保护目录中的 EXE。

本地安装脚本支持 `-Start` 在完成后启动；`-NoShortcuts` 用于不需要桌面入口的部署。已有完整构建资源时，Codex 可通过 `-PreparedAppDirectory` 复用本机产物；不要将用户配置或登录数据作为构建资源复制。

桌面入口缺失或路径变化时运行程序目录的 `Repair-Shortcuts.cmd`。Store 版通常不需要手动选路径；非标准未打包版本可使用 `Select-Codex.cmd`。

启动失败的具体阶段与错误保存在 `%LOCALAPPDATA%\CodexFolia\launcher-error.log`。由本机 Codex 检查；不要修改 WindowsApps 权限，不要把日志和用户信息上传到仓库。

AI 接口通过开始菜单 **配置 AI** 由使用者填写。用户设置、登录和缓存保存在程序目录之外；更新保留这些数据。不要覆盖正在使用的无标记旧安装目录，应先检查并备份迁移。
