/** 通知の種類。見た目や文言を変えるのに使う */
export type Level = 'info' | 'success' | 'warning' | 'error';

/** 通知 1 件。送り手が受信箱へ書く JSON の形と同じ */
export interface Notification {
  title: string;
  message: string;
  /** プロジェクト名 */
  project?: string;
  level?: Level;
  /** 送り手の名前（表示用） */
  source?: string;
}
