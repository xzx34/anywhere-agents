# anywhere-agents 项目理解笔记

> 本文档是对上游仓库 [`yzhao062/anywhere-agents`](https://github.com/yzhao062/anywhere-agents) 的个人学习笔记，整理自本 fork (`xzx34/anywhere-agents`) 的源码阅读。目的：快速说清楚「这是什么、怎么用、内部如何运作」。

## 一、这是什么

一句话：**一份可携带的、带安全护栏的 AI 编码助手配置模板**。作者是 USC 的 Yue Zhao (PyOD 作者)，从 2026 年初起每日使用并持续维护。

它不是一个框架，也不是一个 CLI 工具，而是「一套规则 + 几段脚本 + 四个技能」的组合。通过 `git clone` / `curl` 把这套配置同步到任何项目里，让 Claude Code 和 Codex 在所有项目、所有机器、所有会话里表现一致。

主要解决的问题：

| 痛点 | anywhere-agents 的方案 |
|------|-----------------------|
| 每个仓库的 `CLAUDE.md` 各自漂移 | 中央 `AGENTS.md`，bootstrap 自动同步 |
| 项目间 copy-paste 导致规则分叉 | fork 上游 + `git merge upstream/main` |
| 规则只在脑子里，每次会话重新解释 | 写进配置，启动时自动加载 |
| 写作风格被 AI 腔污染 | PreToolUse 钩子在写入时直接拦截 40 个 AI-tell 词 |
| 手滑执行破坏性命令 | guard.py 对 `git push/commit/reset --hard` 等强制确认 |

支持的 agent：**Claude Code + Codex**（重点支持）。Cursor/Aider/Gemini CLI 也能读 `AGENTS.md` 但未经测试。

## 二、顶层目录结构

```text
anywhere-agents/
├── AGENTS.md                  # 中央规则源文件（带标签，是所有配置的起点）
├── CLAUDE.md                  # 由 AGENTS.md 生成（Claude Code 专用视图）
├── agents/codex.md            # 由 AGENTS.md 生成（Codex 专用视图）
├── bootstrap/
│   ├── bootstrap.sh           # macOS/Linux 同步脚本
│   └── bootstrap.ps1          # Windows 同步脚本
├── scripts/
│   ├── guard.py               # PreToolUse 钩子（5 类护栏）
│   ├── session_bootstrap.py   # SessionStart 钩子（每次会话自动刷新）
│   └── generate_agent_configs.py  # 标签生成器：AGENTS.md → CLAUDE.md + codex.md
├── skills/                    # 4 个领域技能
│   ├── implement-review/
│   ├── my-router/
│   ├── ci-mockup-figure/
│   └── readme-polish/
├── packages/
│   ├── pypi/                  # PyPI 包（pipx run anywhere-agents）
│   └── npm/                   # npm 包（npx anywhere-agents）
├── user/settings.json         # 用户级 Claude Code 设置（含钩子接线、CLAUDE_CODE_EFFORT_LEVEL=max）
├── .claude/
│   ├── commands/              # 技能指针文件（让 Claude Code 发现技能）
│   └── settings.json          # 项目级权限
├── docs/                      # Read the Docs 源文件
├── tests/                     # CI 测试（Ubuntu/Windows/macOS × Python 3.9-3.13）
└── .github/workflows/         # validate / real-agent-smoke / package-smoke
```

## 三、五大核心组件

### 1. `AGENTS.md` — 中央源文件

所有规则的唯一真实来源。通过 HTML 注释标签分段：

```markdown
<!-- agent:claude -->
...只对 Claude Code 生效的内容...
<!-- /agent:claude -->

<!-- agent:codex -->
...只对 Codex 生效的内容...
<!-- /agent:codex -->
```

没有标签包裹的部分对所有 agent 都生效。这个设计让一份文件可以生成多份 agent 专用视图。

内容覆盖：用户画像、写作默认值（含 40 个禁词清单）、格式规则、Git 安全、机械化护栏说明、GitHub Actions 最低版本、环境提示、Claude Code 安装与 effort 级别说明等。

### 2. `bootstrap/bootstrap.sh` / `bootstrap.ps1` — 同步引擎

幂等同步脚本，每次 SessionStart 都会跑。步骤：

1. **解析上游**：优先级 `argv > AGENT_CONFIG_UPSTREAM 环境变量 > .agent-config/upstream 持久化文件 > 默认 yzhao062/anywhere-agents`。
2. **稀疏 clone**：`git clone --depth 1 --filter=blob:none --sparse`，只拉 `skills/`、`.claude/`、`scripts/`、`user/`、`bootstrap/`，体积很小。
3. **生成 agent 视图**：调用 `generate_agent_configs.py` 从 `AGENTS.md` 生成 `CLAUDE.md` + `agents/codex.md`。
4. **用户级部署**：把 `guard.py` 和 `session_bootstrap.py` 复制到 `~/.claude/hooks/`，把 `user/settings.json` 深度合并进 `~/.claude/settings.json`。
5. **项目级合并**：把共享的 `.claude/settings.json` 合并进项目的 `.claude/settings.json`，保留项目专属键。
6. **自我更新**：把拉到的最新 `bootstrap.sh` 覆盖本地旧版本。
7. **修复历史遗留**：把 `~/.claude.json` 中残留的 `autoUpdates: false` 改回 `true`。

Windows 的 `.ps1` 逻辑一致，自实现了 `Merge-Json` 来做和 Bash 版等价的递归合并。

### 3. `scripts/guard.py` — PreToolUse 护栏

Claude Code 每次调用工具前都会跑这个钩子。内置 5 类闸门：

| # | 作用域 | 触发条件 | 动作 |
|---|--------|----------|------|
| 1 | `Write`/`Edit`/`MultiEdit` 写入 `.md`/`.tex`/`.rst`/`.txt` | 内容命中 AGENTS.md 里的 AI-tell 禁词 | **deny**，列出命中词 |
| 2 | 除只读/调度类外的所有工具 | 会话的 banner 还没输出 | **deny**，要求先输出 banner |
| 3 | `Bash` | 命令含 `cd <path> && <cmd>` 或 `cd <path>; <cmd>` | **deny**，建议用 `git -C` 或路径参数 |
| 4 | `Bash` | `git push/commit/merge/rebase/reset --hard/clean/branch -d/tag -d/stash drop` | **ask**（用户确认） |
| 5 | `Bash` | `gh pr create/merge/close`、`gh repo delete` | **ask**（用户确认） |

逃生出口：在 `~/.claude/settings.json` 的 `env` 块里设置 `AGENT_CONFIG_GATES=off`，只会关闭第 1 和第 2 类；第 3、4、5 类始终启用，因为它们守的是不可逆损失。

### 4. `scripts/session_bootstrap.py` — SessionStart 钩子

每次会话（冷启动、resume、clear、compact）都会跑。做三件事：

1. **区分上下文**：向上找 `.agent-config/bootstrap.{sh,ps1}` 来判断是 consumer repo（执行 bootstrap）还是 source repo（跳过 bootstrap）。
2. **写 session-event.json**：每次触发都更新时间戳，配合 guard.py 的 banner 闸门实现跨会话 banner 重显。
3. **刷新版本缓存**：`~/.claude/hooks/version-cache.json`（24h TTL）里记录 Claude Code 和 Codex 的最新版本，用于 banner 里的「有新版本」提示箭头。

### 5. `scripts/generate_agent_configs.py` — 标签生成器

从 `AGENTS.md` 抽取带标签的内容，生成 `CLAUDE.md` 和 `agents/codex.md`。关键点：

- 用正则匹配 `<!-- agent:TAG -->` … `<!-- /agent:TAG -->`。
- 输出文件头部写 `GENERATED FILE` 标记。
- 如果检测到手写版本（没有这个标记），**不覆盖**，只警告，提示用户改名为 `.local.md`。
- 规范化：去行尾空格、连续空行压成两行，避免 `git diff --check` 失败。

## 四、四个内置 skills

| Skill | 触发场景 | 做什么 |
|-------|----------|--------|
| **my-router** | 所有任务开始前 | 读提示词关键词 + 文件类型 + 项目结构，决定分发给哪个下游技能 |
| **implement-review** | 改动已暂存，想做 review | Claude 实现 → Codex 评审 → 写 `CodexReview.md` (High/Med/Low) → Claude 修 → 循环到干净。复杂改动可以先走 Phase 0 的 plan-review |
| **ci-mockup-figure** | 要做论文图 / README hero 图 | HTML + CSS flexbox 做矩形排版的 mockup；TikZ / skia-canvas 做带抽象箭头的图；最后打印成 PDF |
| **readme-polish** | 想让 README 现代化 | 对照 `references/checklist.md` 审计，补 badge、centered header、callout、折叠块、Mermaid 图 |

每个 skill 都在 `skills/<name>/SKILL.md` 有完整定义，`.claude/commands/<name>.md` 是 Claude Code 发现它们的指针。

## 五、典型使用流程

### 消费端：把这套配置加到某个项目

```bash
# 在目标项目根目录
pipx run anywhere-agents     # Python 路径
npx anywhere-agents          # Node.js 路径
```

跑完之后项目里会多出：

```text
your-project/
├── AGENTS.md              # 从上游同步（每次 bootstrap 覆盖）
├── AGENTS.local.md        # 你的项目级覆盖（永不被覆盖）
├── CLAUDE.md              # 由 AGENTS.md 生成
├── agents/codex.md        # 由 AGENTS.md 生成
├── .claude/
│   ├── commands/          # 技能指针
│   └── settings.json      # 项目权限 + 共享键
└── .agent-config/         # 上游缓存（自动 gitignore）
```

### 日常使用：review 前跑一遍

在 Claude Code 里说 "review this"：

```
你 → Claude 暂存 diff → Codex 评审 → CodexReview.md
     ↑                                    ↓
     └────── Claude 修复并重新暂存 ←──────┘
            （循环到没有 finding 为止）
```

### fork 并定制

```bash
# 1. GitHub 上 fork yzhao062/anywhere-agents
# 2. 编辑 AGENTS.md、skills/<your-skill>/、my-router 的路由表
# 3. 让消费端指向你的 fork
bash .agent-config/bootstrap.sh <your-user>/<your-repo>
# 4. 同步上游更新
git remote add upstream https://github.com/yzhao062/anywhere-agents.git
git fetch upstream && git merge upstream/main
```

## 六、配置优先级

三层独立生效：

**1. Agent 规则文件（Markdown）** — 越具体越优先：

```
CLAUDE.local.md / codex.local.md   （手写，bootstrap 不碰）
        ↓
    AGENTS.local.md                （手写，bootstrap 不碰）
        ↓
  CLAUDE.md / codex.md             （生成）
        ↓
     AGENTS.md                     （从上游同步，每次覆盖）
```

**2. Claude Code 设置** — 遵循 Claude Code 自身优先级：
`managed policy > 命令行参数 > .claude/settings.local.json > .claude/settings.json > ~/.claude/settings.json`

**3. Effort 级别环境变量**：
`managed policy > CLAUDE_CODE_EFFORT_LEVEL 环境变量 > 持久化的 effortLevel > Claude Code 默认`

注意 `max` 级别不能通过 `/effort` 持久化，必须靠 `CLAUDE_CODE_EFFORT_LEVEL=max` 环境变量。这套配置已经在 `user/settings.json` 里把这个环境变量设好了。

## 七、对于本 fork 的备忘

- fork 源：`yzhao062/anywhere-agents` → `xzx34/anywhere-agents`。
- 如果要和上游同步：`git remote add upstream https://github.com/yzhao062/anywhere-agents.git && git fetch upstream && git merge upstream/main`。
- 想改写作禁词清单：编辑 `AGENTS.md` 的 Writing Defaults 一节。
- 想改 guard.py 的行为：直接改 `scripts/guard.py`，bootstrap 会把它部署到 `~/.claude/hooks/`。
- 想新增 skill：在 `skills/<name>/` 下放 `SKILL.md`，在 `.claude/commands/<name>.md` 放指针，并在 `skills/my-router/references/routing-table.md` 登记路由规则。

## 八、一句话总结

> 这不是一个跑起来就完事的工具，而是一份「我希望每个项目里每个 AI agent 都这样工作」的持久化配置。Git 是订阅引擎，bootstrap 是同步机制，guard 是护栏，skills 是工作流。
