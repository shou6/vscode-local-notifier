import { Notification } from './types';

/** 受信箱のファイル 1 つの大きさの上限。これを超えたら読まない */
export const MAX_FILE_BYTES = 64 * 1024;

export type ParseResult =
  | { ok: true; notification: Notification }
  | { ok: false; reason: 'too-large' | 'invalid-json' | 'invalid-shape' };

/** 受信箱のファイルの中身を通知にする */
export function parseNotification(_text: string): ParseResult {
  throw new Error('not implemented');
}
