import { Notification } from '../message/types';

/** トーストに表示する 3 行 */
export interface ToastContent {
  title: string;
  body: string;
  /** 下の小さい行。プロジェクト名と送り手の名前 */
  attribution: string;
}

export function formatToast(_notification: Notification): ToastContent {
  throw new Error('not implemented');
}
