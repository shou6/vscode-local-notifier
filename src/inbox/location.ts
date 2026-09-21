/** ワークスペースフォルダからの、Dev Container 用の受信箱の相対パス */
export const DEVCONTAINER_INBOX: readonly string[] = [];

/** 見張る受信箱 1 つ */
export type InboxLocation =
  /** 拡張機能専用の保存フォルダ（context.globalStorageUri）の下 */
  | { kind: 'globalStorage' }
  /** 設定で指定したローカルのフォルダ */
  | { kind: 'path'; path: string }
  /** ワークスペースフォルダの .devcontainer の下 */
  | { kind: 'workspace'; folderIndex: number; project: string };

export interface LocationInput {
  /** vscode.env.remoteName。ローカルなら undefined */
  remoteName: string | undefined;
  /** ワークスペースフォルダの名前 */
  folders: string[];
  /** 設定 localNotifier.inboxPath */
  inboxPath: string;
}

export function inboxLocations(_input: LocationInput): InboxLocation[] {
  throw new Error('not implemented');
}
