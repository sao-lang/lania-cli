[![GitHub License](https://img.shields.io/github/license/sao-lang/lania-tools)](https://github.com/sao-lang/lania-tools/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/sao-lang/lania-tools)](https://github.com/sao-lang/lania-tools/stargazers)
**Lania CLI** 是一个模块化命令行工具集，旨在简化日常开发、项目构建、代码质量管理和 Git 工作流程。

主命令入口：`lan-cli`

## 🚀 快速开始

### 1. 安装

您可以通过 npm 全局安装 Lania CLI：

```bash
# 假设您的包名是 lania-cli
npm install -g lania-cli
```

2. 使用方法

所有命令都通过主入口命令 lan-cli 调用：

```bash
lan-cli <command> [options]
```

📋 命令参考

Lania CLI 将功能划分为基础项目操作、开发流程和 Git 工作流。

I. 基础命令 (Project/Dev/Quality)

| 命令 (Command) | 别名 (Alias) | 描述 (Description) |
|---|---|---|
| lan-cli create [name] | -c | 生成一个新的应用程序。 |
| lan-cli build | -b | 构建应用程序以进行生产部署。 |
| lan-cli dev | -d | 启动应用程序的开发服务器。 |
| lan-cli lint | -l | 对项目代码执行 Linter 检查。 |
1. lan-cli create [name] (别名: -c)

描述: 生成一个新的应用程序。[name] 是新项目的名称。

| 选项 (Flags) | 描述 | 默认值 |
|---|---|---|
| -d, --directory [directory] | 指定项目创建的目标目录。 | 交互式输入 |
| -g, --skip-git | 跳过 Git 仓库的初始化。 | false |
| -s, --skip-install | 跳过包管理器的依赖安装。 | false |
| -p, --package-manager [packageManager] | 指定要使用的包管理器。 | 交互式选择 |
| -l, --language [language] | 指定编程语言 (TypeScript 或 JavaScript)。 | TypeScript |

2. lan-cli build (别名: -b)

描述: 构建应用程序。

| 选项 (Flags) | 描述 | 默认值 |
|---|---|---|
| -c, --config [config] | 配置文件路径。 | 无 |
| -p, --path [path] | Lania 配置文件路径。 | 无 |
| -w, --watch | 以监视 (Watch) 模式运行，检测文件变化并重新构建。 | false |
| -m, --mode [mode] | 指定服务器运行模式（production 或 development）。 | development |
| --mode | 模式 of initiating the project。 | 无 |

3. lan-cli dev (别名: -d)

描述: 启动应用程序的开发服务器。

| 选项 (Flags) | 描述 | 默认值 |
|---|---|---|
| -p, --port [port] | 开发服务器监听的端口。 | 8089 |
| -c, --config [config] | 配置文件路径。 | 无 |
| --hmr | 是否开启热模块替换 (HMR)。 | false |
| --host | 开发服务器的主机地址。 | 127.0.0.1 |
| --path [path] | Lania 配置文件路径。 | 无 |
| --mode | 项目启动模式。 | 无 |
| -o, --open | 启动服务器后自动在浏览器中打开项目。 | false |

4. lan-cli lint (别名: -l)

描述: 对代码执行 Linter 检查。

| 选项 (Flags) | 描述 | 默认值 |
|---|---|---|
| -l, --linters <names> | 指定要用于代码检查的 Linter 名称列表。 | [] (空数组) |
| -f, --fix | 检查代码是否需要修改，并尝试自动修复。 | false |

II. Git 工作流命令

lan-cli sync 是一个集合了提交和推送操作的主命令，它还包含两个可独立使用的子命令：add 和 merge。

5. lan-cli sync (别名: -g)
   
描述: 一键操作 Git 推送代码。该命令会自动 git add . 所有文件，然后提交并推送到远程仓库。

| 选项 (Flags) | 描述 |
|---|---|
| -m, --message [message] | 代码提交时使用的消息。 |
| -b, --branch [branch] | 代码推送时使用的目标分支。 |
| -n, --normatively | 是否强制规范化提交信息 (使用 Commitizen 交互式流程并经过 Commitlint 检查)。 |
| -r, --remote [remote] | 代码推送时使用的远程仓库名称。 |

5.1. 子命令: lan-cli add [files...]

描述: 将更改添加到暂存区 (git add)。

| 参数 (Args) | 描述 |
|---|---|
| [files...] | 要添加到暂存区的文件路径列表。 |
| 子命令特有选项 (未在 SyncCommand 中启用): |  |
| -p, --filepath [directory] | 要添加的文件路径。 |
| -t, --template [template] | 要添加的文件模板。 |
| -n, --name [name] | 要添加的文件名称。 |

5.2. 子命令: lan-cli merge <branch>

描述: 用于 Git 分支合并 (git merge)。

| 参数 (Args) | 描述 |
|---|---|
| <branch> (必填) | 要合并到当前分支的目标分支名称。 |
| 选项 (Flags) | 描述 |
| --no-ff | 创建合并提交，即使可以快进合并。 |
| --ff-only | 拒绝合并，除非可以作为快进合并解决。 |
| --squash | 将目标分支的所有提交合并为当前分支上的单个提交（不创建合并提交）。 |
| --no-commit | 执行合并，但不自动创建提交，允许先检查或修改更改。 |
| --abort | 终止当前正在进行中的合并，并恢复到合并前的状态。 |
| -s, --strategy [strategy] | 指定合并策略 (例如: recursive, ours, theirs)。 |
| -m, --message [message] | 合并提交使用的消息。 |

