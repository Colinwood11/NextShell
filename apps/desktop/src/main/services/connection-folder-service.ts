import type {
  CloudSyncWorkspaceProfile,
  ConnectionFolder,
  ConnectionListQuery,
  ConnectionProfile
} from "@nextshell/core";
import { buildScopeKey, LOCAL_DEFAULT_SCOPE_KEY } from "@nextshell/core";
import { deriveGroupPath, resolveFolderNames, resolveOriginScopeKey } from "@nextshell/shared";
import type { ConnectionFolderCreateInput, ConnectionFolderRepository } from "@nextshell/storage";

/**
 * 重投影需要的最小连接仓储面。抽成端口是为了让重投影逻辑脱离 SQLite 测试
 * (better-sqlite3 是 Electron ABI,单测里跑不起来)。
 */
export interface FolderProjectionConnectionStore {
  list: (query: ConnectionListQuery) => ConnectionProfile[];
  /** 定向单列更新;重投影不能走全行 upsert,那会把手里这份可能过时的整条记录写回去。 */
  updateConnectionGroupPath: (id: string, groupPath: string) => void;
  /** 目录删除时仓储会把连接移到目标父目录,绕过了连接缓存,必须让缓存重读。 */
  invalidateConnections: () => void;
}

export interface ConnectionFolderServiceOptions {
  folders: ConnectionFolderRepository;
  connections: FolderProjectionConnectionStore;
  /**
   * 云 scope 的 workspace 元数据——`/workspace/<slug>` 的 slug 和同步回调 id 来源。
   * 惰性取:CloudSyncManager 在容器里晚于目录仓储构造。
   */
  listCloudWorkspaces: () => CloudSyncWorkspaceProfile[];
  onCloudScopeChanged?: (workspaceId: string) => void;
}

/**
 * 目录写操作的编排层。
 *
 * `folderId` 是本地唯一真相,但 `groupPath` 是**三个外部契约**都在读的投影:云同步线协议
 * (`repoConnectionSchema.groupPath`)、MCP 工具 schema、导出文件格式。裸仓储的
 * rename/move/remove 三条 SQL 只碰 `connection_folders`,子孙连接的 groupPath 会原地留着旧名
 * ——导出文件继续写旧路径,云快照把旧名推给整个 workspace 的其他设备。
 *
 * 所以这三个写操作成功后,要对该 scopeKey 做一次全量重投影;`create` 与 `reorder` 不改任何
 * 连接的目录链,不触发。
 */
export class ConnectionFolderService implements ConnectionFolderRepository {
  constructor(private readonly options: ConnectionFolderServiceOptions) {}

  list(scopeKey?: string): ConnectionFolder[] {
    return this.options.folders.list(scopeKey);
  }

  getById(id: string): ConnectionFolder | undefined {
    return this.options.folders.getById(id);
  }

  /** 新目录里一条连接都没有,投影不变。 */
  create(input: ConnectionFolderCreateInput): ConnectionFolder {
    return this.options.folders.create(input);
  }

  rename(id: string, name: string): ConnectionFolder {
    const folder = this.options.folders.rename(id, name);
    this.reprojectScope(folder.scopeKey);
    return folder;
  }

  move(id: string, parentId: string | undefined): ConnectionFolder {
    const folder = this.options.folders.move(id, parentId);
    this.reprojectScope(folder.scopeKey);
    return folder;
  }

  /** 排序不进 groupPath(投影只由目录名链决定),不重投影。 */
  reorder(id: string, sortIndex: number): ConnectionFolder {
    return this.options.folders.reorder(id, sortIndex);
  }

  remove(id: string): void {
    // scopeKey 只能在删除前拿:删完这条记录就没了。
    const folder = this.options.folders.getById(id);
    if (!folder) {
      this.options.folders.remove(id);
      return;
    }
    this.options.folders.remove(id);
    this.options.connections.invalidateConnections();
    this.reprojectScope(folder.scopeKey);
  }

  countConnections(id: string): number {
    return this.options.folders.countConnections(id);
  }

  /**
   * 按当前目录树把该 scope 内所有连接的 groupPath 重算一遍,只写变化的那些。
   *
   * 全量而不是只走子树:`resolveFolderNames` 本来就要沿父链回溯,子树集合还得先算一遍;
   * 一个 scope 的连接量是「用户手工维护的服务器台数」量级,全量比维护一份子树集合更难写错。
   */
  private reprojectScope(scopeKey: string): boolean {
    const folders = this.options.folders.list(scopeKey);
    const workspace = this.resolveWorkspace(scopeKey);
    const workspaceName = workspace?.workspaceName;
    let changed = false;
    for (const connection of this.options.connections.list({})) {
      if (resolveOriginScopeKey(connection) !== scopeKey) {
        continue;
      }
      // 目录删除后仓储已把连接移到父级;如果父级本身是顶层,这里自然投影到 scope 根。
      const nextGroupPath = deriveGroupPath({
        scopeKey,
        workspaceName,
        folderNames: resolveFolderNames(connection.folderId, folders)
      });
      if (nextGroupPath === connection.groupPath) {
        continue;
      }
      this.options.connections.updateConnectionGroupPath(connection.id, nextGroupPath);
      changed = true;
    }
    if (changed && scopeKey !== LOCAL_DEFAULT_SCOPE_KEY) {
      if (workspace) {
        this.options.onCloudScopeChanged?.(workspace.id);
      }
    }
    return changed;
  }

  private resolveWorkspace(scopeKey: string): CloudSyncWorkspaceProfile | undefined {
    if (scopeKey === LOCAL_DEFAULT_SCOPE_KEY) {
      return undefined;
    }
    return this.options.listCloudWorkspaces().find(
      (workspace) =>
        buildScopeKey({
          kind: "cloud",
          apiBaseUrl: workspace.apiBaseUrl,
          workspaceName: workspace.workspaceName
        }) === scopeKey
    );
  }
}
