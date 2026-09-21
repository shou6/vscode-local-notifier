import * as vscode from 'vscode';
import {
  availableScopes,
  availableShells,
  hookCommand,
  HookScope,
  hookTarget,
  Shell,
} from '../hook/command';
import { resultMessage, testNotification } from '../message/testNotification';
import { Presets } from '../message/preset';
import { Notification } from '../message/types';
import { Notifier, NotifyResult } from '../notify/notifier';
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
export function notifyAndReport(
  notifier: Notifier,
  log: vscode.LogOutputChannel,
  onResult: (result: NotifyResult) => void
): (notification: Notification) => Promise<void> {
  const reported = new Set<string>();
  return async (notification) => {
    const result = await notifier.notify(notification);
    onResult(result);
    if (!result.ok) {
      log.warn('toast failed: ' + (result.reason === 'failed' ? result.detail : result.reason));
    }
    const message = resultMessage(vscode.l10n.t, result);
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
export async function copyHookCommand(
  inboxes: readonly WatchedInbox[],
  presets: Presets
): Promise<void> {
  if (inboxes.length === 0) {
    void vscode.window.showWarningMessage(
      vscode.l10n.t('Notifications are disabled. Enable "localNotifier.enabled" to receive them.')
    );
    return;
  }
  const unsupported = (): void => {
    void vscode.window.showWarningMessage(
      vscode.l10n.t(
        'Hook commands are available for local folders, WSL, and Dev Containers that have a .devcontainer folder.'
      )
    );
  };
  const scopes = availableScopes(
    vscode.env.remoteName,
    inboxes.some((inbox) => inbox.kind === 'workspaceStorage')
  );
  if (scopes.length === 0) {
    unsupported();
    return;
  }

  const payload = await pickPayload(presets);
  if (payload === undefined) {
    return;
  }
  const scope = await pickScope(scopes);
  if (scope === undefined) {
    return;
  }
  const inbox = inboxes.find((candidate) =>
    scope === 'all'
      ? candidate.kind === 'globalStorage' || candidate.kind === 'path'
      : candidate.kind === 'workspaceStorage' || candidate.kind === 'workspace'
  );
  const target =
    inbox &&
    hookTarget(
      vscode.env.remoteName,
      inbox.uri.fsPath,
      inbox.kind === 'workspace' ? inbox.uri.path : undefined
    );
  if (target === undefined) {
    unsupported();
    return;
  }
  const shell = await pickShell(availableShells(target));
  if (shell === undefined) {
    return;
  }
  await vscode.env.clipboard.writeText(hookCommand(target, shell, payload));
  void vscode.window.showInformationMessage(
    vscode.l10n.t("Copied the hook command. Paste it into your tool's hook settings.")
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

/**
 * 受信箱へ書く JSON を選ぶ。定義の名前だけを送るか、文面を直接書くか。
 * 直接書く形は、既定の「完了」の文面を書き換えやすい例として入れる。
 */
async function pickPayload(presets: Presets): Promise<object | undefined> {
  const items: (vscode.QuickPickItem & { payload: object })[] = Object.entries(presets).map(
    ([name, preset]) => ({
      label: name,
      description: preset.title,
      detail: preset.message,
      payload: { preset: name },
    })
  );
  const done = presets.done ?? {};
  items.push({
    label: vscode.l10n.t('Custom text'),
    description: vscode.l10n.t('Write the title and message in the command'),
    payload: { title: done.title, message: done.message, level: done.level ?? 'success' },
  });
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: vscode.l10n.t('Select the notification to send from the hook'),
  });
  return picked?.payload;
}

/** 存在しない定義の名前が届いた時の警告 */
export function warnUnknownPreset(name: string): void {
  void vscode.window.showWarningMessage(
    vscode.l10n.t(
      'Unknown notification preset "{0}". Define it in the "localNotifier.presets" setting.',
      name
    )
  );
}

/** 届け先が 1 つだけなら聞かずにそれを使う */
async function pickScope(scopes: HookScope[]): Promise<HookScope | undefined> {
  if (scopes.length === 1) {
    return scopes[0];
  }
  const items = scopes.map((scope) =>
    scope === 'workspace'
      ? {
          label: vscode.l10n.t('This workspace only'),
          detail: vscode.l10n.t(
            'For hooks in the project settings. Notifications arrive while this workspace is open, and presets in the workspace settings apply.'
          ),
          scope,
        }
      : {
          label: vscode.l10n.t('All workspaces'),
          detail: vscode.l10n.t(
            'For hooks in your user settings. Any open window shows the notification with the presets in your user settings.'
          ),
          scope,
        }
  );
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: vscode.l10n.t('Select where the hook is configured'),
  });
  return picked?.scope;
}
