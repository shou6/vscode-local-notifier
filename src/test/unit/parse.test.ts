import * as assert from 'assert';
import { MAX_FILE_BYTES, parseNotification } from '../../message/parse';

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

  test('上限を超える大きさのものは中身を見ずに無効', () => {
    const text = JSON.stringify({ title: 'T', message: 'x'.repeat(MAX_FILE_BYTES) });
    assert.deepStrictEqual(parseNotification(text), { ok: false, reason: 'too-large' });
  });
});
