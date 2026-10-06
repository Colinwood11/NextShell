# PR #37 body 草稿

## 变更

删除云同步工作区时清理该工作区在本机 SQLite 中的物化连接目录、连接投影、代理、SSH key、凭据、命令和同步记录，避免重新添加同一工作区后出现残留目录或旧资源。

删除操作的范围是**本机同步配置与本地物化数据**；云端工作区和云端其他设备的数据不会因为设置页删除而被删除。

刷新工作区列表时继续用 request id 丢弃过期响应，避免旧响应把已删除工作区重新画回来。移除目录依赖设为必填，测试夹具已同步更新；删除成功后的列表注释与实际时序一致。

## Validation

- `pnpm exec vitest run apps/desktop/src/main/services/cloud-sync-manager.test.ts apps/desktop/src/main/services/connection-folder-service.spec.ts`
- `pnpm --filter @nextshell/desktop run typecheck`
- 设置页真实 Electron 删除操作（2026-10-06，独立临时 userData）：确认框显示“将移除本机的同步配置及该工作区的本地数据，云端工作区不受影响”；确认后 `workspaceList=0`、该工作区连接数为 `0`、物化目录数为 `0`。证据：[确认框](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/37-confirm.png)、[删除后](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/37-removed.png)、[JSON](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/ui-pr-review.json)。

依赖：目录清理使用 #33 引入的目录列举/物化能力；若拆分为独立 PR，请保留 `Depends on #33` 或把所需依赖一并带入。
