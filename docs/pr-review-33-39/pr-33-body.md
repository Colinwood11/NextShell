# PR #33 final body

## Summary

- 将云端 `groupPath` 物化为本地目录链，并把拉取的连接绑定到对应目录。
- 保持既有 workspace fingerprint 公式，避免旧版本本地基线在升级后被误判为本地改动。
- 目录投影更新同时更新时间戳，缓存层与 SQLite 层保持一致。
- 复用 `materializeFolderChain` 的同名目录复用和并发冲突恢复逻辑。
- 目录变更只在连接的实际 `groupPath` 改变时触发对应云工作区同步。

## Compatibility and known limitation

旧版本基线仍可被识别；已增加“旧指纹、远端版本前进、本地未改动仍为 `synced`”回归测试。

目录本身不在云端同步协议中。设备 A 修改目录名或移动目录后，设备 B 会按新的路径创建目录并移动连接；设备 B 上原目录如果已经存在，可能留下空目录。这是当前协议边界，不由本 PR 假装解决。

## Validation

- `pnpm exec vitest run apps/desktop/src/main/services/cloud-sync-manager.test.ts apps/desktop/src/main/services/import-export.spec.ts apps/desktop/src/main/services/connection-folder-service.spec.ts packages/storage/src/cached-repository.test.ts packages/storage/src/connection-folders.test.ts`
- 定向审查回归：19 个文件、283 个测试通过。
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm exec prettier --check`（变更源码和审查文档）
- `git diff --check`
- 真实 Electron 补充验证记录与截图：[审查证据](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/review-completion.md)。

若全量测试仍受 Windows 文件 URL、Shell 子进程或 screen-mirror 环境影响，请列出实际失败用例和环境，不要写成全量通过。
