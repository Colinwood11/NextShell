# PR #36 body 草稿

## Problem

SFTP 目录树和文件列表可能超过底部工作区高度，导致内容被裁剪且没有可用的垂直滚动区域。

## Changes

- 约束 Ant Design 6 Tabs 的 `body-holder`、`body` 和 `content` 高度链。
- 保持 SFTP explorer shell 与文件区可收缩，让现有目录树和虚拟文件列表滚动容器获得可用高度。

## Branch hygiene

请从 `upstream/main`（当前基线 `6065921`）单独重提，只保留 `a85bd955c5e49d2958604454e19924421ffafd44` 对应的修复。不要用 merge commit 把 #33、#34、#35 带入。

## Validation

- `pnpm --filter @nextshell/desktop run typecheck`
- `pnpm --filter @nextshell/desktop run build`
- 真实 Electron UI：本次使用不可达 `127.0.0.1:65534` 测试连接，只能验证 `ConnectionPrompt`；没有真实 SSH 会话，因此 FileExplorerPane 的 `clientHeight/scrollHeight` 未宣称通过。
