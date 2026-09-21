import { randomUUID } from 'crypto';
import * as vscode from 'vscode';
import {
  DEVCONTAINER_INBOX,
  InboxLocation,
  inboxLocations,
  needsPolling,
  POLL_INTERVAL_MS,
} from '../inbox/location';
import { InboxFileSystem, InboxProcessor } from '../inbox/processor';
import { Presets } from '../message/preset';
import { Notification } from '../message/types';

/** 見張っている受信箱 1 つ */
export interface WatchedInbox {
  uri: vscode.Uri;
  /** どの種類の受信箱か */
  kind: InboxLocation['kind'];
  /** 通知に project が無い時に補うプロジェクト名 */
  project?: string;
  /** 変更の知らせに加えて、定期的にも確認するか */
  poll: boolean;
}

/** 受信箱を無視させるために置く .gitignore の中身 */
const GITIGNORE = '*\n';

/** 今の設定とワークスペースから、見張る受信箱の場所を決める */
export async function resolveInboxes(
  globalStorageUri: vscode.Uri,
  storageUri: vscode.Uri | undefined
): Promise<WatchedInbox[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const locations = inboxLocations({
    remoteName: vscode.env.remoteName,
    folders: folders.map((folder) => folder.name),
    inboxPath: vscode.workspace.getConfiguration('localNotifier').get<string>('inboxPath', ''),
    workspaceStorage: storageUri !== undefined,
  });
  const inboxes: WatchedInbox[] = [];
  for (const location of locations) {
    const inbox = await toWatchedInbox(location, globalStorageUri, storageUri, folders);
    if (inbox) {
      inboxes.push(inbox);
    }
  }
  return inboxes;
}

async function toWatchedInbox(
  location: InboxLocation,
  globalStorageUri: vscode.Uri,
  storageUri: vscode.Uri | undefined,
  folders: readonly vscode.WorkspaceFolder[]
): Promise<WatchedInbox | undefined> {
  const poll = needsPolling(location);
  const kind = location.kind;
  switch (location.kind) {
    case 'globalStorage':
      return { uri: vscode.Uri.joinPath(globalStorageUri, 'inbox'), kind, poll };
    case 'path':
      return { uri: vscode.Uri.file(location.path), kind, poll };
    case 'workspaceStorage':
      return storageUri === undefined
        ? undefined
        : { uri: vscode.Uri.joinPath(storageUri, 'inbox'), kind, project: location.project, poll };
    case 'workspace': {
      const folder = folders[location.folderIndex];
      const devcontainer = vscode.Uri.joinPath(folder.uri, DEVCONTAINER_INBOX[0]);
      // .devcontainer の無いフォルダには作らない
      if (!(await exists(devcontainer))) {
        return undefined;
      }
      return {
        uri: vscode.Uri.joinPath(folder.uri, ...DEVCONTAINER_INBOX),
        kind,
        project: location.project,
        poll,
      };
    }
  }
}

/** 受信箱の処理に渡すもの */
export interface WatchOptions {
  notify: (notification: Notification) => Promise<void>;
  presets: Presets;
  onUnknownPreset: (name: string) => void;
}

/**
 * 受信箱を見張り、届いたファイルを通知にする。戻り値を dispose すると見張りをやめる。
 * 起動時に溜まっていたファイルも処理する（古いものは通知せずに消える）。
 * 変更の知らせが届かない受信箱は、定期的にも確認する。
 */
export async function watchInboxes(
  inboxes: WatchedInbox[],
  { notify, presets, onUnknownPreset }: WatchOptions
): Promise<vscode.Disposable> {
  const windowId = randomUUID().slice(0, 8);
  const disposables: vscode.Disposable[] = [];
  for (const inbox of inboxes) {
    try {
      await prepareInbox(inbox.uri);
    } catch {
      continue;
    }
    const processor = new InboxProcessor({
      fs: inboxFileSystem(inbox.uri),
      windowId,
      project: inbox.project,
      now: () => Date.now(),
      notify,
      presets,
      onUnknownPreset,
    });
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(inbox.uri, '*'),
      false,
      false,
      true
    );
    const onFile = (uri: vscode.Uri): void => {
      void processor.processFile(basename(uri));
    };
    disposables.push(watcher, watcher.onDidCreate(onFile), watcher.onDidChange(onFile));
    void processor.processAll();
    if (inbox.poll) {
      const timer = setInterval(() => void processor.processAll(), POLL_INTERVAL_MS);
      disposables.push({ dispose: () => clearInterval(timer) });
    }
  }
  return vscode.Disposable.from(...disposables);
}

/** 受信箱のフォルダを作る。.devcontainer の下なら、中身を git に入れないための .gitignore も置く */
async function prepareInbox(uri: vscode.Uri): Promise<void> {
  await vscode.workspace.fs.createDirectory(uri);
  if (uri.path.includes('/' + DEVCONTAINER_INBOX.join('/'))) {
    const gitignore = vscode.Uri.joinPath(uri, '..', '.gitignore');
    if (!(await exists(gitignore))) {
      await vscode.workspace.fs.writeFile(gitignore, new TextEncoder().encode(GITIGNORE));
    }
  }
}

/** 受信箱へ通知を 1 件書く。書きかけを読まれないよう、一時ファイルに書いてから名前を変える */
export async function writeToInbox(inbox: vscode.Uri, notification: Notification): Promise<void> {
  await vscode.workspace.fs.createDirectory(inbox);
  const name = String(Date.now()) + '-' + randomUUID().slice(0, 8) + '.json';
  const temporary = vscode.Uri.joinPath(inbox, '.tmp-' + name);
  await vscode.workspace.fs.writeFile(
    temporary,
    new TextEncoder().encode(JSON.stringify(notification))
  );
  await vscode.workspace.fs.rename(temporary, vscode.Uri.joinPath(inbox, name));
}

function inboxFileSystem(inbox: vscode.Uri): InboxFileSystem {
  const fs = vscode.workspace.fs;
  const file = (name: string): vscode.Uri => vscode.Uri.joinPath(inbox, name);
  return {
    list: async () => (await fs.readDirectory(inbox)).map(([name]) => name),
    stat: async (name) => {
      const stat = await fs.stat(file(name));
      return { mtimeMs: stat.mtime, size: stat.size };
    },
    rename: (from, to) => Promise.resolve(fs.rename(file(from), file(to), { overwrite: false })),
    read: async (name) => new TextDecoder('utf-8').decode(await fs.readFile(file(name))),
    delete: (name) => Promise.resolve(fs.delete(file(name))),
  };
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function basename(uri: vscode.Uri): string {
  return uri.path.slice(uri.path.lastIndexOf('/') + 1);
}
