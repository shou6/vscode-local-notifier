import * as assert from 'assert';
import {
  DEFAULT_TOAST_OPTIONS,
  formatToast,
  toastOptions,
  ToastOptions,
} from '../../notify/format';

const NO_ICON: ToastOptions = { ...DEFAULT_TOAST_OPTIONS, showIcon: false };

suite('formatToast', () => {
  test('アイコンを付けない設定なら、タイトルをそのまま使う', () => {
    const content = formatToast({ title: 'Done', message: 'Body', level: 'info' }, NO_ICON);
    assert.deepStrictEqual(content, {
      title: 'Done',
      body: 'Body',
      attribution: '',
      duration: 'short',
    });
  });

  test('アイコンを付ける設定なら、種類ごとの絵文字をタイトルの前に付ける', () => {
    const titles = (['success', 'info', 'warning', 'error'] as const).map(
      (level) => formatToast({ title: 'T', message: 'M', level }, DEFAULT_TOAST_OPTIONS).title
    );
    assert.deepStrictEqual(titles, ['✅ T', 'ℹ️ T', '🟡 T', '🔴 T']);
  });

  test('level を省略したら info として扱う', () => {
    const content = formatToast({ title: 'T', message: 'M' }, DEFAULT_TOAST_OPTIONS);
    assert.strictEqual(content.title, 'ℹ️ T');
    assert.strictEqual(content.duration, 'short');
  });

  test('表示時間は種類ごとの設定に従う。既定では警告とエラーだけ長い', () => {
    const durations = (['success', 'info', 'warning', 'error'] as const).map(
      (level) => formatToast({ title: 'T', message: 'M', level }, DEFAULT_TOAST_OPTIONS).duration
    );
    assert.deepStrictEqual(durations, ['short', 'short', 'long', 'long']);
  });

  test('下の行にはプロジェクト名と送り手の名前を並べる', () => {
    const content = formatToast(
      { title: 'T', message: 'M', project: 'app', source: 'Claude Code' },
      NO_ICON
    );
    assert.strictEqual(content.attribution, 'app · Claude Code');
  });

  test('プロジェクト名か送り手の名前の片方だけでも表示する', () => {
    assert.strictEqual(
      formatToast({ title: 'T', message: 'M', project: 'app' }, NO_ICON).attribution,
      'app'
    );
    assert.strictEqual(
      formatToast({ title: 'T', message: 'M', source: 'CI' }, NO_ICON).attribution,
      'CI'
    );
  });
});

suite('toastOptions', () => {
  test('設定が無ければ既定の値', () => {
    assert.deepStrictEqual(toastOptions(undefined, undefined), DEFAULT_TOAST_OPTIONS);
  });

  test('アイコンの有無を設定から読む', () => {
    assert.strictEqual(toastOptions(false, undefined).showIcon, false);
    assert.strictEqual(toastOptions(true, undefined).showIcon, true);
  });

  test('表示時間は、書いた種類だけを上書きする', () => {
    assert.deepStrictEqual(toastOptions(undefined, { info: 'long', error: 'short' }).durations, {
      info: 'long',
      success: 'short',
      warning: 'long',
      error: 'short',
    });
  });

  test('壊れた値は無視して既定を使う', () => {
    assert.deepStrictEqual(
      toastOptions('yes', { info: 'forever', success: 3, unknown: 'long' }),
      DEFAULT_TOAST_OPTIONS
    );
    assert.deepStrictEqual(toastOptions(undefined, 'long'), DEFAULT_TOAST_OPTIONS);
  });

  test('既定の値を書き換えない', () => {
    toastOptions(false, { info: 'long' });
    assert.strictEqual(DEFAULT_TOAST_OPTIONS.showIcon, true);
    assert.strictEqual(DEFAULT_TOAST_OPTIONS.durations.info, 'short');
  });
});
