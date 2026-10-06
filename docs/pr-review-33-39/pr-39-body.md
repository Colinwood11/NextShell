# PR #39 body 草稿

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
- 多级子目录单测覆盖：`connection-folder-service.spec.ts` 覆盖三层子目录；本次定向管理器/目录/存储测试合计 19 个文件、274 个测试通过。
- 真实 Electron 确认框（2026-10-06，独立临时 userData）：不勾选时子目录删除、连接移到原父目录；勾选时子目录删除、连接走删除 IPC 且回收站计数增加。证据：`docs/pr-review-33-39/evidence/39-folder-confirm-unchecked.png`、`39-folder-confirm-checked.png`、`ui-pr-review.json`。
