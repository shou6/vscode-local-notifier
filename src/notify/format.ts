import { isLevel, Level, Notification } from '../message/types';

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

/**
 * 種類ごとにタイトルの前へ付ける絵文字。
 * 警告とエラーは、成功と情報の絵文字と大きさが揃う色の丸にする（⚠ は通知で単色になった）。
 */
const ICONS: Record<Level, string> = {
  success: '✅',
  info: 'ℹ️',
  warning: '🟡',
  error: '🔴',
};

/** 設定 localNotifier.showLevelIcon と localNotifier.duration から、見た目の設定を作る。壊れた値は無視する */
export function toastOptions(showIcon: unknown, durations: unknown): ToastOptions {
  const options: ToastOptions = {
    showIcon: typeof showIcon === 'boolean' ? showIcon : DEFAULT_TOAST_OPTIONS.showIcon,
    durations: { ...DEFAULT_TOAST_OPTIONS.durations },
  };
  if (typeof durations === 'object' && durations !== null && !Array.isArray(durations)) {
    for (const [level, duration] of Object.entries(durations)) {
      if (isLevel(level) && (duration === 'short' || duration === 'long')) {
        options.durations[level] = duration;
      }
    }
  }
  return options;
}

export function formatToast(notification: Notification, options: ToastOptions): ToastContent {
  const level = notification.level ?? 'info';
  return {
    title: options.showIcon ? ICONS[level] + ' ' + notification.title : notification.title,
    body: notification.message,
    attribution: [notification.project, notification.source]
      .filter((part): part is string => part !== undefined && part !== '')
      .join(' · '),
    duration: options.durations[level],
  };
}
