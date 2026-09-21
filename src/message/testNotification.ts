import { NotifyResult } from '../notify/notifier';
import { Notification } from './types';

/** vscode.l10n.t と同じ形の翻訳関数。テストでは翻訳しない関数に差し替える */
export type Translate = (message: string, ...args: string[]) => string;

/** テスト通知の中身 */
export function testNotification(_t: Translate, _folderName: string | undefined): Notification {
  throw new Error('not implemented');
}

/** 通知の結果を利用者に伝える文言。成功なら undefined（トーストが出れば十分） */
export function resultMessage(_t: Translate, _result: NotifyResult): string | undefined {
  throw new Error('not implemented');
}
