/**
 * ワークスペースフォルダからの、Dev Container 用の受信箱の相対パス。
 * Dev Container を使うプロジェクトには必ず .devcontainer があり、コンテナとホストの両方から見える。
 */
export const DEVCONTAINER_INBOX: readonly string[] = ['.devcontainer', '.local-notifier', 'inbox'];

/** 見張る受信箱 1 つ */
export type InboxLocation =
  /** 拡張機能専用の保存フォルダ（context.globalStorageUri）の下 */
  | { kind: 'globalStorage' }
  /** 設定で指定したローカルのフォルダ */
  | { kind: 'path'; path: string }
  /** ワークスペースフォルダの .devcontainer の下 */
  | { kind: 'workspace'; folderIndex: number; project: string }
  /** ワークスペースごとの保存フォルダ（context.storageUri）の下 */
  | { kind: 'workspaceStorage'; project: string };

export interface LocationInput {
  /** vscode.env.remoteName。ローカルなら undefined */
  remoteName: string | undefined;
  /** ワークスペースフォルダの名前 */
  folders: string[];
  /** 設定 localNotifier.inboxPath */
  inboxPath: string;
  /** ワークスペースごとの保存フォルダがあるか（フォルダを開いている時だけある） */
  workspaceStorage: boolean;
}

/**
 * 見張る受信箱を決める。
 * ローカルの受信箱（ローカルと WSL の送り手が書く）はどのウィンドウでも見張る。
 * Dev Container に接続中は、加えて各ワークスペースフォルダの .devcontainer の下も見張る。
 */
/** 定期的な確認の間隔。通知の遅れの目安（2 秒）に合わせる */
export const POLL_INTERVAL_MS = 2000;

/**
 * 変更の知らせに加えて、定期的にも確認する受信箱か。
 * Dev Container の受信箱では、コンテナの中の変更の知らせが VS Code に届かなかった（検証 V2）。
 */
export function needsPolling(location: InboxLocation): boolean {
  return location.kind === 'workspace';
}

export function inboxLocations(input: LocationInput): InboxLocation[] {
  const inboxPath = input.inboxPath.trim();
  const local: InboxLocation =
    inboxPath === '' ? { kind: 'globalStorage' } : { kind: 'path', path: inboxPath };
  if (input.remoteName !== 'dev-container') {
    return [local];
  }
  return [
    local,
    ...input.folders.map((project, folderIndex): InboxLocation => ({
      kind: 'workspace',
      folderIndex,
      project,
    })),
  ];
}
