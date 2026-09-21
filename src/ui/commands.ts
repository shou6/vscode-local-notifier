import * as vscode from 'vscode';
import { resultMessage, testNotification } from '../message/testNotification';
import { Notification } from '../message/types';
import { Notifier } from '../notify/notifier';
import { WatchedInbox, writeToInbox } from './inbox';

/**
 * コマンド「Send Test Notification」の本体。
 * 受信箱へ書いて、見張りから通知が出るまでの経路全体を確かめる。
 * Dev Container に接続中は .devcontainer の下の受信箱を使う。
 */
export async function sendTestNotification(inboxes: readonly WatchedInbox[]): Promise<void> {
  const inbox = inboxes.find((candidate) => candidate.project !== undefined) ?? inboxes[0];
  if (inbox === undefined) {
    void vscode.window.showWarningMessage(
      vscode.l10n.t('Notifications are disabled. Enable "localNotifier.enabled" to receive them.')
    );
    return;
  }
  const folderName = vscode.workspace.workspaceFolders?.[0]?.name;
  await writeToInbox(inbox.uri, testNotification(vscode.l10n.t, folderName));
}

/**
 * 通知を出し、失敗したら利用者に伝える。
 * 同じ文言は 1 回のセッションで 1 度だけ出す（hook のたびに警告が出続けないように）。
 */
export function notifyAndReport(notifier: Notifier): (notification: Notification) => Promise<void> {
  const reported = new Set<string>();
  return async (notification) => {
    const message = resultMessage(vscode.l10n.t, await notifier.notify(notification));
    if (message !== undefined && !reported.has(message)) {
      reported.add(message);
      void vscode.window.showWarningMessage(message);
    }
  };
}
