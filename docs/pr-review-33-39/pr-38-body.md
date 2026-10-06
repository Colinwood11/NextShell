# PR #38 body 草稿

## 变更

- 保留工作区列表请求的 request id 保护和失败时保留上一份列表。
- 移除会在异步加载期间清空深链作用域的 effect，避免云端 `focusConnectionId` 回落到本地作用域。
- 文件夹单击进入时，在同一次物理双击的短窗口内忽略落到新出现连接磁贴上的 click/dblclick，避免误连接未被点击的服务器。
- 撤回没有可复现证据支持的弹层挂载改动。

## Product behavior

文件夹采用单击进入；在云端连接可用但本地连接为空时默认选择首个云作用域：`[待维护者确认此产品行为并在最终描述保留/删除]`。

## Validation

- `pnpm exec vitest run apps/desktop/src/renderer/components/ConnectionManagerV2/components/render.test.tsx apps/desktop/src/renderer/components/ConnectionManagerV2`
- `pnpm --filter @nextshell/desktop run typecheck`
- 真实 Electron 鼠标双击（2026-10-06，生产构建、独立临时 userData）：`locator.dblclick()` 作用于含两台服务器的文件夹，结果只进入目录并显示两台服务器，没有打开服务器详情/会话。证据：`docs/pr-review-33-39/evidence/38-folder-dblclick.png`。
- 真实 Electron 云作用域选择：选择 `PR UI Cloud` 后显示 `Cloud UI 127.0.0.1`。证据：`docs/pr-review-33-39/evidence/38-cloud-scope.png`。
- 400ms 延迟深链：contextBridge 的 `workspaceList` 方法为只读，无法安全注入延迟；该异步场景由 renderer regression tests 覆盖，本次不宣称完成真实延迟注入。
