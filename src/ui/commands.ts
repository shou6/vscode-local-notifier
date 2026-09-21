import * as vscode from 'vscode';
import { resultMessage, testNotification } from '../message/testNotification';
import { Notifier } from '../notify/notifier';

/** コマンド「Send Test Notification」の本体 */
export async function sendTestNotification(notifier: Notifier): Promise<void> {
  const folderName = vscode.workspace.workspaceFolders?.[0]?.name;
  const result = await notifier.notify(testNotification(vscode.l10n.t, folderName));
  const message = resultMessage(vscode.l10n.t, result);
  if (message !== undefined) {
    void vscode.window.showWarningMessage(message);
  }
}
