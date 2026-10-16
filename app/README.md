# Codex Folia 0.1.15

Windows 10/11 x64 的 Folia 播放器与 Codex 背景接入。

## 使用

先安装官方 Windows 版 Codex，再安装 Codex Folia，从桌面 **Codex Folia 背景** 打开，使用自己的 Codex 和音乐账号登录。开始菜单提供打开、关闭背景、配置 AI、使用说明和卸载入口。

保留原版播放器、歌词动画、曲库、队列、主题及可用音效。右侧面板右下角可收起，点击当前歌曲卡片恢复。桌面布局入口与收起按钮在面板底部。

歌词、翻译和和声字幕可分别移动、缩放、调整宽高及复原；双击框外退出布局编辑。设置类窗口从顶部空白区域拖动；内容、滑块和下拉菜单保留正常操作。

音乐与下载直接连接，不改动 Codex 或系统代理。歌曲缓存默认关闭，开启后的容量上限为 15 GB。音乐平台权限取决于使用者自己的账号与网络。

## AI 配置

开始菜单的 **配置 AI** 会创建并打开当前使用者的配置文件。在 `ai` 中填写自己的 `baseUrl`、`model` 和 `apiKey`，保存后关闭背景并重新打开。三个字段默认都为空，不附带个人接口、模型路由或密钥，也不读取 Codex 的 `.env`。

未配置 AI 时，听歌、原生效果及内置主题继续可用。

## 数据与更新

实际配置、独立 Codex profile、播放器数据及日志保存在 `%LOCALAPPDATA%\CodexFolia`。默认缓存位于其中的 `Cache`；可在 `settings.json` 的 `cacheDirectory` 指定其他磁盘目录。

程序不改写 Codex 安装包，不复制已有登录数据。卸载保留使用者自己的设置和登录。Codex 更新后仍从本项目快捷方式进入；若官方界面或调试接口改变，接入可能需要更新。

## 源码与构建

GitHub 项目的根目录包含 `Build.ps1`、`packaging/` 和展开的 `source/folia/` 完整源码，使用方法见根目录 `README.md`。`app/` 中的 JS、MJS 和 PS1 文件是接入层源码。

从源码构建需要 Windows x64、Node.js 24、npm 和 NSIS 3。根目录执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1 -NsisPath "NSIS目录\makensis.exe"
```

构建脚本准备运行环境和依赖，生成播放器资源、对应源码归档及安装器，输出在 `dist/`。源码仓库不附带依赖和预构建程序；完成一次构建后，可加 `-SkipAppBuild` 只重打安装器。

安装后的程序在 `source/folia-source.zip` 提供对应 Folia 源码；接入脚本本身也是可编辑源码。Folia 基线为 0.7.19、提交 `a75748272c6dfa060edf4bbae709c49f0be8a68e`，包含本项目嵌入修改。

## 许可

Folia 及本接入修改按 AGPL-3.0 分发，见 `LICENSE-Folia`。Node.js 和第三方依赖保留各自许可，见 `licenses/` 及依赖包中的许可文件。发布时保留完整对应源码、许可证与上游署名。

这是独立社区接入项目。
