import { Preset, Presets } from './preset';
import { isLevel, Notification } from './types';

/** 受信箱のファイル 1 つの大きさの上限。これを超えたら読まない */
export const MAX_FILE_BYTES = 64 * 1024;

export type ParseResult =
  | { ok: true; notification: Notification }
  | { ok: false; reason: 'too-large' | 'invalid-json' | 'invalid-shape' }
  | { ok: false; reason: 'unknown-preset'; preset: string };

/**
 * 受信箱のファイルの中身を通知にする。
 * preset があれば定義の文面を使い、一緒に書いた項目で上書きする。
 * 最終的に title と message が揃わないものは無効。任意の項目は、型が合わなければ無視する。
 */
export function parseNotification(text: string, presets: Presets = {}): ParseResult {
  if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
    return { ok: false, reason: 'too-large' };
  }
  let value: unknown;
  try {
    // PowerShell 5 の出力などで、先頭に BOM が付くことがある
    value = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'invalid-shape' };
  }
  const record = value as Record<string, unknown>;

  let preset: Preset = {};
  if (record.preset !== undefined) {
    if (typeof record.preset !== 'string') {
      return { ok: false, reason: 'invalid-shape' };
    }
    if (!Object.hasOwn(presets, record.preset)) {
      return { ok: false, reason: 'unknown-preset', preset: record.preset };
    }
    preset = presets[record.preset];
  }

  const title = nonBlank(record.title) ?? nonBlank(preset.title);
  const message = nonBlank(record.message) ?? nonBlank(preset.message);
  if (title === undefined || message === undefined) {
    return { ok: false, reason: 'invalid-shape' };
  }

  const notification: Notification = { title, message };
  if (typeof record.project === 'string') {
    notification.project = record.project;
  }
  const level = isLevel(record.level) ? record.level : preset.level;
  if (level !== undefined) {
    notification.level = level;
  }
  const source = typeof record.source === 'string' ? record.source : preset.source;
  if (source !== undefined) {
    notification.source = source;
  }
  return { ok: true, notification };
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}
