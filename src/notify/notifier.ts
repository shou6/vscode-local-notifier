import { Notification } from '../message/types';
import { ProcessRunner } from '../platform/process';

export type NotifyResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' }
  | { ok: false; reason: 'failed'; detail: string };

/** デスクトップ通知を出す。OS ごとに実装を差し替える */
export interface Notifier {
  notify(notification: Notification): Promise<NotifyResult>;
}

export function createNotifier(
  _platform: string,
  _runner: ProcessRunner,
  _appId: string
): Notifier {
  throw new Error('not implemented');
}
