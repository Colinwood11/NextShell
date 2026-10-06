# PR #35 body 草稿

## Summary

Windows checkout 可能把 shell integration 资源带成 CRLF；这些字节原样安装到 Linux 后会造成 bash 的 `$'\\r': command not found` 和函数语法错误。

在自动注入和手动安装共用的 `buildFileInstallScript` 汇合点统一转换为 LF，并加入 CRLF 输入回归测试。

## Validation

- `pnpm exec vitest run <实际 shell integration 与 launch 测试>`
- `pnpm --filter @nextshell/desktop run typecheck`
- Windows 环境无法执行的 POSIX bash/dash 用例：`[待填实际数量和原因]`

可选补充：增加 `.gitattributes` 将四个脚本固定为 LF。若不增加，该补充不影响本 PR 的运行时修复。
