import * as vscode from 'vscode';
import { toastAppId } from './notify/appId';
import { createNotifier } from './notify/notifier';
import { nodeProcessRunner } from './platform/process';
import { copyHookCommand, notifyAndReport, sendTestNotification } from './ui/commands';
import { resolveInboxes, WatchedInbox, watchInboxes } from './ui/inbox';

/** 統合テストから見張りの状態を確かめるための戻り値 */
export interface LocalNotifierApi {
  /** 設定の反映が終わるのを待ち、見張っている受信箱を返す */
  inboxes(): Promise<readonly WatchedInbox[]>;
}

/** エントリポイント。登録だけを行い、ロジックは各モジュールに置く */
export function activate(context: vscode.ExtensionContext): LocalNotifierApi {
  const notifier = createNotifier(
    process.platform,
    nodeProcessRunner,
    toastAppId(vscode.env.appName)
  );
  const notify = notifyAndReport(notifier);

  let inboxes: WatchedInbox[] = [];
  let watching: vscode.Disposable | undefined;
  /** 設定やワークスペースが変わったら見張り直す。前の見張り直しが終わってから次を行う */
  let restarting: Promise<void> = Promise.resolve();
  const restart = (): Promise<void> =>
    (restarting = restarting.then(async () => {
      watching?.dispose();
      watching = undefined;
      inboxes = [];
      if (!vscode.workspace.getConfiguration('localNotifier').get<boolean>('enabled', true)) {
        return;
      }
      inboxes = await resolveInboxes(context.globalStorageUri);
      watching = await watchInboxes(inboxes, notify);
    }));

  context.subscriptions.push(
    vscode.commands.registerCommand('localNotifier.sendTestNotification', async () => {
      await restarting;
      await sendTestNotification(inboxes);
    }),
    vscode.commands.registerCommand('localNotifier.copyHookCommand', async () => {
      await restarting;
      await copyHookCommand(inboxes);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('localNotifier')) {
        void restart();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => void restart()),
    { dispose: () => watching?.dispose() }
  );
  void restart();

  return {
    inboxes: async () => {
      await restarting;
      return inboxes;
    },
  };
}

export function deactivate(): void {}
