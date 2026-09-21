import { Translate } from './testNotification';
import { isLevel, Level } from './types';

/** 通知の定義 1 つ。設定で一部だけを上書きできるよう、すべて任意 */
export interface Preset {
  title?: string;
  message?: string;
  level?: Level;
  source?: string;
}

export type Presets = Record<string, Preset>;

/** 既定の定義。文面は表示言語に合わせて翻訳する */
export function builtInPresets(t: Translate): Presets {
  return {
    done: {
      title: t('Task completed'),
      message: t('The agent has finished its work.'),
      level: 'success',
    },
    waiting: {
      title: t('Waiting for input'),
      message: t('The agent is waiting for your input.'),
      level: 'info',
    },
    error: {
      title: t('Stopped with an error'),
      message: t('The agent stopped because of an error.'),
      level: 'error',
    },
  };
}

/**
 * 既定の定義に、設定 localNotifier.presets の値を重ねる。
 * 既定と同じ名前なら書いた項目だけを上書きし、新しい名前なら足す。壊れた値は無視する。
 */
export function mergePresets(builtIn: Presets, configured: unknown): Presets {
  const merged: Presets = {};
  for (const [name, preset] of Object.entries(builtIn)) {
    merged[name] = { ...preset };
  }
  if (!isRecord(configured)) {
    return merged;
  }
  for (const [name, value] of Object.entries(configured)) {
    if (!isRecord(value)) {
      continue;
    }
    const preset = { ...merged[name] };
    for (const key of ['title', 'message', 'source'] as const) {
      const text = value[key];
      if (typeof text === 'string' && text.trim() !== '') {
        preset[key] = text;
      }
    }
    if (isLevel(value.level)) {
      preset.level = value.level;
    }
    if (Object.keys(preset).length > 0) {
      merged[name] = preset;
    }
  }
  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
