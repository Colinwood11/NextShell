# PR #39 final body

## 变更

- 删除目录时在事务内读取被删目录的原父级；目录本身及所有子目录会删除，子树内服务器移动到原父目录。
- 确认框文案明确说明子目录会级联删除、服务器会移动到上一级；勾选“同时删除服务器”时包含子目录内服务器。
- 服务器删除复用现有连接删除 IPC 流程，因此会关闭相关会话、进入回收站并执行既有凭据/云端墓碑处理。
- 确认回调执行时重新计算子树和受影响连接，避免对话框打开期间的同步刷新漏删新连接。
- 删除后只有连接路径实际变化时才触发云工作区同步；路径不变时不做无效标脏。

## Validation

- `pnpm exec vitest run apps/desktop/src/main/services/connection-folder-service.spec.ts packages/storage/src/connection-folders.test.ts`
- `pnpm --filter @nextshell/desktop run typecheck`
- `pnpm --filter @nextshell/storage run typecheck`
- clean #39 分支的目录/存储定向测试为 3 个文件、57 个测试通过；最终整合工作区另跑了管理器/目录/存储回归合计 19 个文件、283 个测试通过。
- 真实 Electron 确认框（2026-10-06，独立临时 userData）：不勾选时子目录删除、连接移到原父目录；勾选时子目录删除、连接走删除 IPC 且回收站计数增加。证据：[不勾选](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/39-folder-confirm-unchecked.png)、[勾选](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/39-folder-confirm-checked.png)、[JSON](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/ui-pr-review.json)。
- 补充 renderer harness 验证了删除失败后的重试 bookkeeping：`removeIds` 为 `A,B,B`，只有失败项再次提交；证据：[部分失败](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/39-folder-delete-partial-failure.png)、[重试后](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/39-folder-delete-checked-after-retry.png)。该 harness 使用 mock IPC，不替代完整应用后端运行。
