// Main-process dependencies the bundler leaves as bare imports, resolved by
// Node's ESM loader at runtime. Shared by vite.config.ts and
// cjs-import-guard.spec.ts so the guard checks exactly what ships external.
export const MAIN_EXTERNAL_MODULES = [
  "ssh2",
  "node-pty",
  "better-sqlite3",
  "electron-log",
  "keytar"
];

export const isMainExternal = (id: string): boolean =>
  id.endsWith(".node") ||
  MAIN_EXTERNAL_MODULES.some(
    (name) => id === name || id.startsWith(`${name}/`) || id.includes(`/${name}/`)
  );
