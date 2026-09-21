import { Notification } from '../message/types';

/** トーストに表示する 3 行 */
export interface ToastContent {
  title: string;
  body: string;
  /** 下の小さい行。プロジェクト名と送り手の名前 */
  attribution: string;
}

export function formatToast(notification: Notification): ToastContent {
  return {
    title: notification.title,
    body: notification.message,
    attribution: [notification.project, notification.source]
      .filter((part): part is string => part !== undefined && part !== '')
      .join(' · '),
  };
}
