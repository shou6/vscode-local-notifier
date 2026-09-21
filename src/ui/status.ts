import * as vscode from 'vscode';
import { StatusInput, statusRows } from '../status/report';

type StatusItem = vscode.QuickPickItem & { run?: () => void | Thenable<unknown> };

/**
 * コマンド「Show Status」の本体。状態の一覧を出し、直すための操作へ進めるようにする。
 * 一覧の各行は表示だけで、下の操作を選ぶと実行する。
 */
export async function showStatus(input: StatusInput, log: vscode.LogOutputChannel): Promise<void> {
  const items: StatusItem[] = statusRows(vscode.l10n.t, input).map((row) => ({
    label: (row.problem ? '$(warning) ' : '$(check) ') + row.label,
    description: row.description,
    detail: row.detail,
  }));
  items.push(
    { label: vscode.l10n.t('Actions'), kind: vscode.QuickPickItemKind.Separator },
    {
      label: '$(bell) ' + vscode.l10n.t('Send Test Notification'),
      run: () => vscode.commands.executeCommand('localNotifier.sendTestNotification'),
    },
    {
      label: '$(copy) ' + vscode.l10n.t('Copy Hook Command'),
      run: () => vscode.commands.executeCommand('localNotifier.copyHookCommand'),
    },
    {
      label: '$(output) ' + vscode.l10n.t('Show Log'),
      description: vscode.l10n.t('What happened to each notification file'),
      run: () => log.show(),
    }
  );
  const picked = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Local Notifier: Status'),
    placeHolder: vscode.l10n.t('Select an action'),
  });
  await picked?.run?.();
}
