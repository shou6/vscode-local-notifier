import { InboxLocation } from '../inbox/location';
import { Translate } from '../message/testNotification';
import { NotifyResult } from '../notify/notifier';

/** 状態の一覧を作るのに要るもの */
export interface StatusInput {
  /** process.platform */
  platform: string;
  /** vscode.env.remoteName */
  remoteName: string | undefined;
  /** 設定 localNotifier.enabled */
  enabled: boolean;
  /** 見張っている受信箱 */
  inboxes: { kind: InboxLocation['kind']; path: string; poll: boolean; project?: string }[];
  /** このウィンドウで最後に出した通知の結果。まだ出していなければ undefined */
  lastToast: NotifyResult | undefined;
}

/** 一覧の 1 行 */
export interface StatusRow {
  label: string;
  description?: string;
  detail?: string;
  /** 利用者が直す必要のある問題か */
  problem: boolean;
}

/**
 * 状態の一覧。上から、通知を出せるか、最後の通知の結果、接続先、見張っている受信箱の順。
 */
export function statusRows(_t: Translate, _input: StatusInput): StatusRow[] {
  throw new Error('not implemented');
}
