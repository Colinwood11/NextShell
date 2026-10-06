import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CloudSyncWorkspaceProfile, ConnectionFolder } from "@nextshell/core";
import { formatErrorMessage } from "../../../utils/errorMessage";
import { buildManagerScopes, resolveActiveScope, type ManagerScope } from "../utils/scopes";
import { reconcileCurrentFolder } from "../utils/folderNavigation";

interface UseManagerScopeOptions {
  open: boolean;
  onError: (message: string) => void;
  /** 只有云端有服务器时，打开管理器应直接落到第一个云工作区。 */
  hasLocalConnections?: boolean;
  /** 从“添加新服务器”进入时仍保留本地新建语义。 */
  preferCloudWhenNoLocal?: boolean;
}

export interface ManagerScopeState {
  scopes: ManagerScope[];
  activeScope: ManagerScope;
  selectScope: (key: string) => void;
  folders: ConnectionFolder[];
  reloadFolders: () => Promise<void>;
  currentFolderId?: string;
  enterFolder: (folderId: string | undefined) => void;
}

/**
 * 作用域与目录的加载。切作用域时目录必须一起换,而且当前目录要清空——目录 id 是按 scope 分区
 * 的,拿旧 id 去新作用域查只会得到一个空列表,看起来像连接丢了。
 */
export const useManagerScope = ({
  open,
  onError,
  hasLocalConnections = false,
  preferCloudWhenNoLocal = true
}: UseManagerScopeOptions): ManagerScopeState => {
  const [workspaces, setWorkspaces] = useState<CloudSyncWorkspaceProfile[]>([]);
  const [selectedScopeKey, setSelectedScopeKey] = useState<string>();
  const [folders, setFolders] = useState<ConnectionFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>();
  const workspaceLoadRequestRef = useRef(0);

  const scopes = useMemo(() => buildManagerScopes(workspaces), [workspaces]);
  const activeScope = useMemo(
    () => resolveActiveScope(scopes, selectedScopeKey),
    [scopes, selectedScopeKey]
  );

  // 云同步工作区里的连接不会出现在本地作用域。没有本地连接时，打开管理器默认落到
  // 第一个云工作区，避免用户看到空的本地列表而误以为同步结果没有进入服务器列表。
  useEffect(() => {
    if (
      !open ||
      !preferCloudWhenNoLocal ||
      hasLocalConnections ||
      selectedScopeKey ||
      workspaces.length === 0
    ) {
      return;
    }
    const firstCloudScope = scopes.find((scope) => scope.kind === "cloud");
    if (firstCloudScope) {
      setSelectedScopeKey(firstCloudScope.key);
    }
  }, [
    hasLocalConnections,
    open,
    preferCloudWhenNoLocal,
    scopes,
    selectedScopeKey,
    workspaces.length
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const load = () => {
      const requestId = ++workspaceLoadRequestRef.current;
      window.nextshell.cloudSync
        .workspaceList()
        .then((nextWorkspaces) => {
          // 状态广播和打开管理器会同时触发读取；旧请求晚返回时不能把新列表
          // 覆盖成空数组，尤其是在网络较慢的机器上会表现为下拉框没有内容。
          if (requestId === workspaceLoadRequestRef.current) {
            setWorkspaces(nextWorkspaces);
          }
        })
        .catch(() => {
          // 读取失败时保留上一份可用列表；状态广播期间的瞬时 IPC/网络错误不应
          // 把作用域下拉框清空。首次读取失败时初始值本来就是空数组。
        });
    };
    load();
    const unsubscribeStatus = window.nextshell.cloudSync.onStatus(load);
    const unsubscribeApplied = window.nextshell.cloudSync.onApplied(load);
    return () => {
      workspaceLoadRequestRef.current += 1;
      unsubscribeStatus();
      unsubscribeApplied();
    };
  }, [open]);

  const reloadFolders = useCallback(async () => {
    if (!open) {
      return;
    }
    try {
      setFolders(await window.nextshell.connectionFolder.list({ scopeKey: activeScope.key }));
    } catch (error) {
      onError(`加载目录失败：${formatErrorMessage(error, "请稍后重试")}`);
      setFolders([]);
    }
  }, [activeScope.key, onError, open]);

  useEffect(() => {
    void reloadFolders();
  }, [reloadFolders]);

  // 目录被删除、或作用域切换后 id 不再属于当前域时，回到根。
  useEffect(() => {
    setCurrentFolderId((previous) => reconcileCurrentFolder(previous, folders));
  }, [folders]);

  const selectScope = useCallback((key: string) => {
    setSelectedScopeKey(key);
    setCurrentFolderId(undefined);
    setFolders([]);
  }, []);

  // 必须 memo:调用方把整个返回值当 effect 依赖(外部定位那条就是),每次渲染新建一个对象
  // 会让那些 effect 每帧都跑一遍——轻则白跑,重则和自己的 setState 组成重渲循环。
  return useMemo(
    () => ({
      scopes,
      activeScope,
      selectScope,
      folders,
      reloadFolders,
      currentFolderId,
      enterFolder: setCurrentFolderId
    }),
    [activeScope, currentFolderId, folders, reloadFolders, scopes, selectScope]
  );
};
