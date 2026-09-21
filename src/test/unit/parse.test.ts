import * as assert from 'assert';
import { MAX_FILE_BYTES, parseNotification } from '../../message/parse';
import { Presets } from '../../message/preset';

const PRESETS: Presets = {
  done: { title: 'Done', message: 'Finished', level: 'success' },
  ci: { title: 'CI', message: 'Failed', level: 'error', source: 'GitHub' },
};

suite('parseNotification', () => {
  test('必須の title と message があれば通知になる', () => {
    assert.deepStrictEqual(parseNotification('{"title":"Done","message":"Finished"}'), {
      ok: true,
      notification: { title: 'Done', message: 'Finished' },
    });
  });

  test('任意の project、level、source を読む', () => {
    const text = JSON.stringify({
      title: 'T',
      message: 'M',
      project: 'app',
      level: 'success',
      source: 'agent',
    });
    assert.deepStrictEqual(parseNotification(text), {
      ok: true,
      notification: { title: 'T', message: 'M', project: 'app', level: 'success', source: 'agent' },
    });
  });

  test('未知の項目は無視する', () => {
    const result = parseNotification('{"title":"T","message":"M","extra":1}');
    assert.deepStrictEqual(result, { ok: true, notification: { title: 'T', message: 'M' } });
  });

  test('知らない level は無視して info として扱う', () => {
    const result = parseNotification('{"title":"T","message":"M","level":"fatal"}');
    assert.deepStrictEqual(result, { ok: true, notification: { title: 'T', message: 'M' } });
  });

  test('文字列でない任意の項目は無視する', () => {
    const result = parseNotification('{"title":"T","message":"M","project":3,"source":null}');
    assert.deepStrictEqual(result, { ok: true, notification: { title: 'T', message: 'M' } });
  });

  test('先頭に BOM があっても読む（PowerShell 5 の出力に付くことがある）', () => {
    const result = parseNotification('﻿{"title":"T","message":"M"}');
    assert.strictEqual(result.ok, true);
  });

  test('壊れた JSON は無効', () => {
    assert.deepStrictEqual(parseNotification('{"title":'), { ok: false, reason: 'invalid-json' });
  });

  test('オブジェクトでない JSON は無効', () => {
    for (const text of ['[]', '"text"', 'null', '1']) {
      assert.deepStrictEqual(parseNotification(text), { ok: false, reason: 'invalid-shape' }, text);
    }
  });

  test('title か message が欠けている、文字列でない、空白だけのものは無効', () => {
    for (const text of [
      '{"message":"M"}',
      '{"title":"T"}',
      '{"title":1,"message":"M"}',
      '{"title":"  ","message":"M"}',
      '{"title":"T","message":""}',
    ]) {
      assert.deepStrictEqual(parseNotification(text), { ok: false, reason: 'invalid-shape' }, text);
    }
  });

  test('preset を指定すると、定義の文面を使う', () => {
    assert.deepStrictEqual(parseNotification('{"preset":"done"}', PRESETS), {
      ok: true,
      notification: { title: 'Done', message: 'Finished', level: 'success' },
    });
  });

  test('preset と一緒に書いた項目は、定義を上書きする', () => {
    const text = JSON.stringify({ preset: 'done', message: 'Build passed', project: 'app' });
    assert.deepStrictEqual(parseNotification(text, PRESETS), {
      ok: true,
      notification: { title: 'Done', message: 'Build passed', project: 'app', level: 'success' },
    });
  });

  test('定義の source も使い、書いた source で上書きできる', () => {
    assert.deepStrictEqual(parseNotification('{"preset":"ci"}', PRESETS), {
      ok: true,
      notification: { title: 'CI', message: 'Failed', level: 'error', source: 'GitHub' },
    });
    const overridden = parseNotification('{"preset":"ci","source":"Local"}', PRESETS);
    assert.strictEqual(overridden.ok && overridden.notification.source, 'Local');
  });

  test('定義に文面が足りず、直接も書いていなければ無効', () => {
    const presets = { partial: { title: 'Only title' } };
    assert.deepStrictEqual(parseNotification('{"preset":"partial"}', presets), {
      ok: false,
      reason: 'invalid-shape',
    });
  });

  test('存在しない定義の名前は、名前を添えて無効', () => {
    assert.deepStrictEqual(parseNotification('{"preset":"nope"}', PRESETS), {
      ok: false,
      reason: 'unknown-preset',
      preset: 'nope',
    });
  });

  test('preset が文字列でなければ無効', () => {
    assert.deepStrictEqual(parseNotification('{"preset":1}', PRESETS), {
      ok: false,
      reason: 'invalid-shape',
    });
  });

  test('上限を超える大きさのものは中身を見ずに無効', () => {
    const text = JSON.stringify({ title: 'T', message: 'x'.repeat(MAX_FILE_BYTES) });
    assert.deepStrictEqual(parseNotification(text), { ok: false, reason: 'too-large' });
  });
});
