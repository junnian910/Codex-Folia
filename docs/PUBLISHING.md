# GitHub 发布说明

源码已展开在 `source/folia/`，接入源码在 `app/`，构建与安装脚本也随仓库提供。第三方依赖由锁文件恢复，固定 Node.js 运行环境由构建脚本准备。

1. 运行 `node scripts/check-public.mjs --check-local`，检查上传候选文件。
2. 查看 `git diff --cached --stat`，核对实际暂存的源码和文档。
3. 使用本项目的匿名 Git 作者配置提交。当前项目没有沿用原工作目录的 Git 历史，也没有配置远程地址。
4. 选择用于发布的 GitHub 账号和仓库，然后推送源码。
5. 构建后的 EXE、压缩包和校验码作为 Releases 附件上传。

GitHub 普通仓库阻止大于 100 MiB 的单个文件；安装包通过 Releases 分发。官方说明：https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github

`.gitignore` 已排除依赖、Node.js 二进制、播放器构建资源、安装包、真实配置、密钥文件、日志和登录数据。上游合法版权和许可证保留。

文件内容和提交作者可脱敏；GitHub 仓库仍会显示发布账号。请由发布者选择公开使用的账号身份。
