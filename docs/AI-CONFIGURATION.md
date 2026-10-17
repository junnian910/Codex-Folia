# AI 接口配置

开始菜单的 **配置 AI** 会打开配置文件，填写以下三个字段：

| 字段 | 填写内容 |
| --- | --- |
| `ai.baseUrl` | 服务商的 OpenAI 兼容接口基础地址或聊天接口地址 |
| `ai.model` | 服务商提供的模型名称 |
| `ai.apiKey` | 使用者自己的 API 密钥 |

默认值为空，样例见 `app/settings.example.json`。保存后，从开始菜单关闭背景并重新打开。

配置文件保存在 `%LOCALAPPDATA%\CodexFolia\settings.json`。使用自建服务时，按该服务要求填写接口地址、模型和鉴权值。

未完成配置时，AI 按钮会提示先填写接口；听歌、歌词效果和内置主题仍可使用。
