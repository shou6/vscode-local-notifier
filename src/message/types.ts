/** 通知の種類。見た目や文言を変えるのに使う */
export type Level = 'info' | 'success' | 'warning' | 'error';

const LEVELS: readonly unknown[] = ['info', 'success', 'warning', 'error'] satisfies Level[];

export function isLevel(value: unknown): value is Level {
  return LEVELS.includes(value);
}

/** 通知 1 件 */
export interface Notification {
  title: string;
  message: string;
  /** プロジェクト名 */
  project?: string;
  level?: Level;
  /** 送り手の名前（表示用） */
  source?: string;
}
