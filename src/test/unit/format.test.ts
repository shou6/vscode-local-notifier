import * as assert from 'assert';
import { formatToast } from '../../notify/format';

suite('formatToast', () => {
  test('info はタイトルをそのまま使う', () => {
    const content = formatToast({ title: 'Done', message: 'Body', level: 'info' });
    assert.deepStrictEqual(content, { title: 'Done', body: 'Body', attribution: '' });
  });

  test('level を省略したら info と同じ', () => {
    assert.strictEqual(formatToast({ title: 'Done', message: 'Body' }).title, 'Done');
  });

  test('success、warning、error はタイトルの前に記号を付けて見分けられるようにする', () => {
    const titles = (['success', 'warning', 'error'] as const).map(
      (level) => formatToast({ title: 'T', message: 'M', level }).title
    );
    assert.deepStrictEqual(titles, ['✔ T', '⚠ T', '✖ T']);
  });

  test('下の行にはプロジェクト名と送り手の名前を並べる', () => {
    const content = formatToast({
      title: 'T',
      message: 'M',
      project: 'app',
      source: 'Claude Code',
    });
    assert.strictEqual(content.attribution, 'app · Claude Code');
  });

  test('プロジェクト名か送り手の名前の片方だけでも表示する', () => {
    assert.strictEqual(
      formatToast({ title: 'T', message: 'M', project: 'app' }).attribution,
      'app'
    );
    assert.strictEqual(formatToast({ title: 'T', message: 'M', source: 'CI' }).attribution, 'CI');
  });
});
