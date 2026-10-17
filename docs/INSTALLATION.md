# 安装与启动

需要 Windows x64 和已安装的官方 Codex。构建环境为 Node.js 24 与 npm，可由本机 Codex 准备。

将仓库地址发给 Codex，让它按照本文完成安装：

1. 选择程序目录，例如 `D:\Program Files\Codex Folia`。Folia 与 Codex 支持安装在不同磁盘。
2. 在源码根目录运行下面的命令，完成依赖准备、播放器构建、快捷方式创建与首次启动。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-Local.ps1 -InstallDirectory "D:\Program Files\Codex Folia" -Start
```

3. 确认桌面出现带 Folia 图标的 **Codex Folia 背景**，并检查背景和播放器正常显示。

以后双击这个桌面快捷方式即可运行。它会自动启动本地背景服务并连接 Codex；Codex 尚未打开时会自动启动。图标使用程序目录内的 `folia.ico`。

Store 版通过 Windows 登记的应用入口自动识别。非标准的未打包版本可通过程序目录的 `Select-Codex.cmd` 选择入口。桌面快捷方式缺失或路径变化时，运行 `Repair-Shortcuts.cmd` 重建。

AI 接口从开始菜单 **配置 AI** 填写。设置与登录保存在 `%LOCALAPPDATA%\CodexFolia`，更新时保留。启动错误的详细提示位于其中的 `launcher-error.log`。

本地安装脚本还支持 `-NoShortcuts` 和 `-PreparedAppDirectory`，分别用于省略快捷方式和复用已有构建资源。
