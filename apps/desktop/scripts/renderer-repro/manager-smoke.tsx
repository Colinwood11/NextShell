import { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "antd";
import type { ConnectionProfile } from "@nextshell/core";
import type { NextShellApi, ConnectionUpsertInput } from "@nextshell/shared";
import { ConnectionManagerV2 } from "../../src/renderer/components/ConnectionManagerV2";

// In-memory IPC only: this harness never loads the desktop main process or real servers.
const connection: ConnectionProfile = {
  id: "existing",
  name: "server",
  host: "example.com",
  port: 22,
  username: "root",
  authType: "password",
  strictHostKeyChecking: true,
  proxyId: "proxy",
  keepAliveEnabled: true,
  keepAliveIntervalSec: 42,
  terminalEncoding: "gbk",
  backspaceMode: "ascii-delete",
  deleteMode: "ascii-backspace",
  monitorSession: false,
  tags: ["prod"],
  favorite: true,
  notes: "keep me",
  groupPath: "/server",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z"
};
const smoke = {
  records: [connection, { ...connection, id: "second", name: "second" }],
  writes: [] as ConnectionUpsertInput[],
  removes: [] as string[],
  connects: [] as string[],
  failRemove: "",
  deferSave: false,
  finishSave: () => {},
  closed: 0
};
Object.assign(window, { smoke });
const noop = () => {};
window.nextshell = {
  cloudSync: { workspaceList: async () => [], onStatus: () => noop, onApplied: () => noop },
  connectionFolder: { list: async () => [] },
  connection: {
    upsert: async (input: ConnectionUpsertInput) => {
      smoke.writes.push(input);
      if (smoke.deferSave)
        await new Promise<void>((resolve) => {
          smoke.finishSave = resolve;
        });
      const saved = {
        ...connection,
        ...input,
        id: input.id ?? `new-${smoke.writes.length}`
      } as ConnectionProfile;
      smoke.records = [...smoke.records.filter((item) => item.id !== saved.id), saved];
      return saved;
    },
    remove: async ({ id }: { id: string }) => {
      smoke.removes.push(id);
      if (smoke.failRemove === id) throw new Error("Simulated delete failure");
      smoke.records = smoke.records.filter((item) => item.id !== id);
      return { ok: true };
    }
  }
} as unknown as NextShellApi;

function Harness() {
  const [connections, setConnections] = useState(smoke.records);
  return (
    <ConnectionManagerV2
      open
      connections={connections}
      sshKeys={[]}
      proxies={[]}
      onClose={() => {
        smoke.closed++;
      }}
      onConnectConnection={async (id) => {
        smoke.connects.push(id);
      }}
      onOpenLocalTerminal={noop}
      onOpenSettingsSection={noop}
      onReloadConnections={async () => setConnections([...smoke.records])}
      onReloadSshKeys={async () => {}}
      onReloadProxies={async () => {}}
    />
  );
}
createRoot(document.getElementById("root")!).render(
  <App>
    <Harness />
  </App>
);
