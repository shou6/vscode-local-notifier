import * as vscode from 'vscode';
import { availableShells, hookCommand, hookTarget, Shell } from '../hook/command';
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

/**
 * コマンド「Copy Hook Command」の本体。
 * 今の環境で、受信箱へ通知を書くコマンドを作ってクリップボードへ写す。
 */
export async function copyHookCommand(inboxes: readonly WatchedInbox[]): Promise<void> {
  if (inboxes.length === 0) {
    void vscode.window.showWarningMessage(
      vscode.l10n.t('Notifications are disabled. Enable "localNotifier.enabled" to receive them.')
    );
    return;
  }
  const local = inboxes.find((inbox) => inbox.project === undefined);
  const devcontainer = inboxes.find((inbox) => inbox.project !== undefined);
  const target = hookTarget(vscode.env.remoteName, local?.uri.fsPath ?? '', devcontainer?.uri.path);
  if (target === undefined) {
    void vscode.window.showWarningMessage(
      vscode.l10n.t(
        'Hook commands are available for local folders, WSL, and Dev Containers that have a .devcontainer folder.'
      )
    );
    return;
  }

  const shell = await pickShell(availableShells(target));
  if (shell === undefined) {
    return;
  }
  const example: Notification = {
    title: vscode.l10n.t('Task completed'),
    message: vscode.l10n.t('The agent has finished its work.'),
    level: 'success',
  };
  await vscode.env.clipboard.writeText(hookCommand(target, shell, example));
  void vscode.window.showInformationMessage(
    vscode.l10n.t(
      "Copied the hook command. Paste it into your tool's hook settings and change the title and message as you like."
    )
  );
}

/** シェルが 1 つだけなら聞かずにそれを使う */
async function pickShell(shells: Shell[]): Promise<Shell | undefined> {
  if (shells.length === 1) {
    return shells[0];
  }
  const items = shells.map((shell) => ({
    label: shell === 'bash' ? 'bash' : 'PowerShell',
    description:
      shell === 'bash' ? vscode.l10n.t('Git Bash on Windows') : vscode.l10n.t('Windows PowerShell'),
    shell,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: vscode.l10n.t('Select the shell that runs your hook'),
  });
  return picked?.shell;
}
