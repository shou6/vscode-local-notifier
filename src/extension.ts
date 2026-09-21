import * as vscode from 'vscode';
import { toastAppId } from './notify/appId';
import { createNotifier } from './notify/notifier';
import { nodeProcessRunner } from './platform/process';
import { sendTestNotification } from './ui/commands';

/** エントリポイント。登録だけを行い、ロジックは各モジュールに置く */
export function activate(context: vscode.ExtensionContext): void {
  const notifier = createNotifier(
    process.platform,
    nodeProcessRunner,
    toastAppId(vscode.env.appName)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('localNotifier.sendTestNotification', () =>
      sendTestNotification(notifier)
    )
  );
}

export function deactivate(): void {}
