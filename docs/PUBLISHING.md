# GitHub 发布说明

源码已展开在 `source/folia/`，接入源码在 `app/`，构建与安装脚本也随仓库提供。第三方依赖由锁文件恢复，固定 Node.js 运行环境由构建脚本准备。

1. 运行 `node scripts/check-public.mjs --check-local`，检查上传候选文件。
2. 查看 `git diff --cached --stat`，核对实际暂存的源码和文档。
3. 使用不含个人姓名和邮箱的 Git 作者配置提交。本项目未复制原工作目录的 Git 历史。
4. 选择用于发布的 GitHub 账号和仓库，然后推送源码。
5. Releases 仅上传安装器 EXE、完整源码 ZIP 和安装说明。哈希校验文件、隐私报告和安装检查 JSON 仅留本地。

GitHub 普通仓库阻止大于 100 MiB 的单个文件；安装包通过 Releases 分发。官方说明：https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github

`.gitignore` 已排除依赖、Node.js 二进制、播放器构建资源、安装包、真实配置、密钥文件、日志、登录数据和生成的检查报告。应用运行和构建必需的 JSON 配置继续保留。上游合法版权和许可证保留。

文件内容和提交作者可脱敏；GitHub 仓库仍会显示发布账号。请由发布者选择公开使用的账号身份。
