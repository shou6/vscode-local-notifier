import { NotifyResult } from '../notify/notifier';
import { Notification } from './types';

/** vscode.l10n.t と同じ形の翻訳関数。テストでは翻訳しない関数に差し替える */
export type Translate = (message: string, ...args: string[]) => string;

/** テスト通知の中身 */
export function testNotification(t: Translate, folderName: string | undefined): Notification {
  return {
    title: t('Local Notifier'),
    message: t('This is a test notification.'),
    project: folderName,
    level: 'info',
    source: 'VS Code',
  };
}

/** 通知の結果を利用者に伝える文言。成功なら undefined（トーストが出れば十分） */
export function resultMessage(t: Translate, result: NotifyResult): string | undefined {
  if (result.ok) {
    return undefined;
  }
  return result.reason === 'unsupported'
    ? t('Desktop notifications are only supported on Windows.')
    : t('Failed to show the notification: {0}', result.detail);
}
