import { Level, Notification } from '../message/types';

/** トーストに表示する 3 行 */
export interface ToastContent {
  title: string;
  body: string;
  /** 下の小さい行。プロジェクト名と送り手の名前 */
  attribution: string;
}

/** 種類ごとにタイトルの前へ付ける記号。info は付けない */
const PREFIX: Record<Level, string> = {
  info: '',
  success: '✔ ',
  warning: '⚠ ',
  error: '✖ ',
};

export function formatToast(notification: Notification): ToastContent {
  return {
    title: PREFIX[notification.level ?? 'info'] + notification.title,
    body: notification.message,
    attribution: [notification.project, notification.source]
      .filter((part): part is string => part !== undefined && part !== '')
      .join(' · '),
  };
}
