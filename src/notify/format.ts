import { Level, Notification } from '../message/types';

/** Windows の通知の表示時間。短い（約 7 秒）か長い（約 25 秒）の 2 つだけ */
export type Duration = 'short' | 'long';

/** 通知の見た目の設定 */
export interface ToastOptions {
  /** タイトルの前に種類ごとの絵文字を付けるか */
  showIcon: boolean;
  /** 種類ごとの表示時間 */
  durations: Record<Level, Duration>;
}

export const DEFAULT_TOAST_OPTIONS: ToastOptions = {
  showIcon: true,
  durations: { info: 'short', success: 'short', warning: 'long', error: 'long' },
};

/** トーストに表示する 3 行と表示時間 */
export interface ToastContent {
  title: string;
  body: string;
  /** 下の小さい行。プロジェクト名と送り手の名前 */
  attribution: string;
  duration: Duration;
}

/** 設定 localNotifier.showLevelIcon と localNotifier.duration から、見た目の設定を作る */
export function toastOptions(_showIcon: unknown, _durations: unknown): ToastOptions {
  throw new Error('not implemented');
}

export function formatToast(_notification: Notification, _options: ToastOptions): ToastContent {
  throw new Error('not implemented');
}
