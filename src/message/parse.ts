import { Level, Notification } from './types';

/** 受信箱のファイル 1 つの大きさの上限。これを超えたら読まない */
export const MAX_FILE_BYTES = 64 * 1024;

export type ParseResult =
  | { ok: true; notification: Notification }
  | { ok: false; reason: 'too-large' | 'invalid-json' | 'invalid-shape' };

const LEVELS: readonly string[] = ['info', 'success', 'warning', 'error'] satisfies Level[];

/**
 * 受信箱のファイルの中身を通知にする。
 * 必須の title と message が無いものは無効。任意の項目は、型が合わなければ無視する。
 */
export function parseNotification(text: string): ParseResult {
  if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
    return { ok: false, reason: 'too-large' };
  }
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'invalid-shape' };
  }
  const record = value as Record<string, unknown>;
  const title = nonBlank(record.title);
  const message = nonBlank(record.message);
  if (title === undefined || message === undefined) {
    return { ok: false, reason: 'invalid-shape' };
  }

  const notification: Notification = { title, message };
  if (typeof record.project === 'string') {
    notification.project = record.project;
  }
  if (typeof record.level === 'string' && LEVELS.includes(record.level)) {
    notification.level = record.level as Level;
  }
  if (typeof record.source === 'string') {
    notification.source = record.source;
  }
  return { ok: true, notification };
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}
