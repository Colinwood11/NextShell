# PR #34 closeout note

建议关闭此 PR：SFTP 目录树的高度链问题已由 #36 的 Ant Design Tabs 高度约束修复；本 PR 引入的标准 `scrollbar-width`/`scrollbar-color` 会让 macOS/Chromium 的滚动条回到覆盖式系统行为，并与仓库现有滚动条样式不一致。

已引用 #36 并关闭本 PR。#36 的 renderer 布局证据见 [SFTP 布局截图](https://github.com/Colinwood11/NextShell/blob/codex/fix-cloud-sync-groups/docs/pr-review-33-39/evidence/36-sftp-layout-scroll.png)；完整应用的真实 SSH 文件区因测试端点不可达，未宣称通过。
