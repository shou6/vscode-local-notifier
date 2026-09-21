import { Translate } from './testNotification';
import { Level } from './types';

/** 通知の定義 1 つ。設定で一部だけを上書きできるよう、すべて任意 */
export interface Preset {
  title?: string;
  message?: string;
  level?: Level;
  source?: string;
}

export type Presets = Record<string, Preset>;

/** 既定の定義。文面は表示言語に合わせて翻訳する */
export function builtInPresets(_t: Translate): Presets {
  throw new Error('not implemented');
}

/** 既定の定義に、設定 localNotifier.presets の値を重ねる。壊れた値は無視する */
export function mergePresets(_builtIn: Presets, _configured: unknown): Presets {
  throw new Error('not implemented');
}
