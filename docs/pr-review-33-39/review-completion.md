# PR #33–#39 审查与修复收尾

本文对应 `C:/Users/admin/Downloads/Telegram Desktop/Untitled.docx` 中的审查指南。它记录代码修复后的交付状态，不代替 GitHub 上的 PR 更新。

## 当前结论

代码层面的审查问题已经按编号处理，范围包括：旧云同步指纹兼容、目录物化冲突复用、云作用域回调、工作区本地物化数据清理、目录双击误连接、异步云作用域深链、目录删除文案与实际行为、连接删除流程复用、事务内读取目录父级，以及删除后的无效云同步标脏。

指南要求的 PR 收尾记录：

- [x] 已准备对应编号的 body 草稿；推送 clean branch 后回填 GitHub PR。
- [x] #33 body 明确说明目录不在云端协议中：其他设备可能保留改名前的空目录。
- [x] #37 body 和 UI 文案明确删除范围是本机同步配置与本地物化数据；云端工作区不会因该操作被删除。
- [x] #38 已完成真实 Electron 鼠标双击和云作用域选择；workspaceList 延迟深链无法通过只读 contextBridge 注入，保留 renderer 回归测试覆盖并在 body 标明。
- [x] #39 已完成真实 Electron 确认框（勾选/不勾选）和多级目录结果验证，截图已保存。
- [x] #34 已标记为由 #36 覆盖；滚动条样式没有继续合入。
- [x] #36/#37/#39/#38 已准备从 `upstream/main` 拆分的 clean branch 方案，禁止继续携带 merge 堆叠历史。
- [x] #35 的 `.gitattributes` 作为可选项不增加。
- [x] body 只列真实跑过的命令；全量测试的平台/环境失败单独标明。
- [ ] GitHub PR head/body 更新与 #34 关闭：等待 clean branch 提交和推送完成。

## 编号状态

| PR | 代码状态 | 指南收尾状态 | 关键限制 |
|---|---|---|---|
| #33 | 已修复 | 文档待贴回 | 目录不是在线协议字段，跨设备可能残留旧空目录 |
| #34 | 已撤回相关样式 | 建议关闭 | 根因由 #36 处理 |
| #35 | 已修复 | 可合并前需更新验证事实 | `.gitattributes` 仅可选 |
| #36 | 修复已在历史中 | 需拆分重提 | 只保留 `a85bd955`，不要带堆叠 PR |
| #37 | 已修复 | Electron 已验证；PR body 待更新 | 删除的是本机数据，不删除云端工作区 |
| #38 | 已修复 | Electron 双击/云作用域已验证；延迟深链由回归测试覆盖 | 需要维护者确认“仅云连接默认首个作用域”产品行为 |
| #39 | 已修复 | Electron 确认框和多级目录已验证；PR body 待更新 | 子目录会删除，服务器移到原父目录 |

## 已完成的自动化验证

以下结果来自当前修复过程；在最终 PR body 中应以本次提交后重新执行的结果为准：

- 定向 Vitest：云同步、目录服务、存储目录和连接管理器测试通过。
- `pnpm run typecheck` 通过。
- 变更文件 Prettier 检查和 `git diff --check` 通过。
- ESLint 无错误；已有 Hook 依赖警告需原样说明。

全量测试存在平台/环境边界：Windows 文件 URL、Shell 子进程和 screen-mirror 超时相关用例曾失败。提交前应重新运行并把实际数量、错误和环境写入 PR body。

## 真实 UI 验证记录

验证日期：2026-10-06。环境：Windows + Electron 40.10.6，生产构建，独立临时 userData；通过真实 preload IPC 写入测试数据，所有连接均为 `127.0.0.1:65534`，没有访问真实服务器。

| 场景 | 复现方式 | 结果 | 证据 |
|---|---|---|---|
| #38 文件夹双击 | 真实 Electron `locator.dblclick()`，文件夹内两台服务器 | 只进入目录并显示两台服务器，未打开服务器详情/会话 | `evidence/38-folder-dblclick.png` |
| #38 云作用域 | 真实 Electron 选择云作用域并显示云连接 | `PR UI Cloud` 作用域和云连接可见 | `evidence/38-cloud-scope.png` |
| #38 延迟深链 | contextBridge 方法为只读，无法安全注入 400ms 延迟 | 未进行真实延迟注入；由 renderer 回归测试覆盖 | `apps/desktop/src/renderer/components/ConnectionManagerV2/components/render.test.tsx` |
| #36 SFTP 高度/滚动 | 连接故意指向不可达测试端口 | 未验证真实 FileExplorerPane；应用正确显示连接提示 | `evidence/ui-pr-review.json` |
| #34 滚动条回退 | 检查最终源码/构建结果 | 已确认相关滚动条改动未保留；#34 待关闭 | `apps/desktop/src/renderer/styles/file-explorer.css` |
| #39 删除确认框 | 真实 Electron 多级目录，分别不勾选/勾选 | 文案与行为一致；不勾选移回原父目录，勾选删除并进入回收站 | `evidence/39-folder-confirm-unchecked.png`, `evidence/39-folder-confirm-checked.png` |
| #37 工作区删除 | 设置页真实删除临时云工作区 | 确认框明确本机范围；删除后 workspace/物化连接/目录均为 0 | `evidence/37-confirm.png`, `evidence/37-removed.png` |

## 指南要求分类

### 必须项

旧数据升级回归测试、目录物化冲突复用、删除目录行为与文案一致、复用现有连接删除流程、事务内确定目录父级、确认时计算影响范围、清理 #37 的不实防御代码、真实 UI 交互验证、PR body 中列出最终行为和实际命令、堆叠 PR 拆分与依赖说明。

### 可选项

为 #35 增加 `.gitattributes` 固定脚本为 LF；是否保留 #38 的“只有云端服务器时默认选择首个云作用域”行为并在 PR 描述中确认产品决策。

### 当前遗漏或待确认

GitHub PR body/head 更新、#34 关闭和 clean branch 推送仍需在提交阶段完成；#38 的 400ms 延迟深链仍以回归测试为证据，真实 Electron contextBridge 不可安全注入该延迟。
