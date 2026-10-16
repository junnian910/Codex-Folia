# 安装与启动

下载 Releases 中的 `Codex-Folia-Setup-0.1.16-win-x64.exe` 并运行。源码 ZIP 用于开发，不能代替安装器。

先在这台电脑安装并正常打开官方 Codex。Folia 可以安装在 D 盘、E 盘或其他可写入的文件夹，不要求与 Codex 同盘。

安装器会为当前 Windows 用户创建桌面和开始菜单快捷方式，并检查创建结果。桌面目录被重定向到 OneDrive 或其他磁盘时，使用 Windows 返回的实际目录。

桌面没有快捷方式时，打开 Folia 安装文件夹，运行 `Repair-Shortcuts.cmd`。这个入口也能修复快捷方式指向旧位置的情况。

如果启动时找不到 Codex，先正常打开 Codex，再从 Folia 快捷方式重试。还不能识别时，运行 `Select-Codex.cmd`，选择 Codex **桌面程序**，不要选择命令行版。设置只保存在自己的用户目录中。

“无法访问”会附上具体失败阶段和程序路径；完整提示保存在 `%LOCALAPPDATA%\CodexFolia\launcher-error.log`。这个日志和所有用户设置都不会上传到仓库或发布包。

更新安装时覆盖原 Folia 安装目录即可，用户设置和登录仍保存在安装目录之外。Codex 更新后会重新查找入口；如果官方以后改变界面或调试接口，接入仍可能需要适配。
