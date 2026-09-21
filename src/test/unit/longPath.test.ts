import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { longPath } from '../../platform/longPath';

suite('longPath', () => {
  test('Windows の短いパス名（8.3 形式）を、正式な長いパス名に直す', async () => {
    if (process.platform !== 'win32') {
      return;
    }
    // 8 文字を超える名前のフォルダには、短いパス名が付く（付かない設定の PC では確かめられない）
    const long = fs.mkdtempSync(path.join(os.tmpdir(), 'longpathtest-'));
    try {
      const short = execFileSync(
        'cmd.exe',
        ['/d', '/c', 'for %I in ("' + long + '") do @echo %~sI'],
        {
          encoding: 'utf8',
        }
      ).trim();
      if (short === long) {
        return;
      }
      assert.strictEqual(await longPath(short), fs.realpathSync.native(long));
      assert.ok(!(await longPath(short)).includes('~'), await longPath(short));
    } finally {
      fs.rmSync(long, { recursive: true, force: true });
    }
  });

  test('ふつうのパスは、そのまま返す', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-'));
    try {
      const real = fs.realpathSync.native(dir);
      assert.strictEqual(await longPath(real), real);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('存在しないパスは、例外にせずそのまま返す', async () => {
    const missing = path.join(os.tmpdir(), 'no-such-dir-' + String(Date.now()));
    assert.strictEqual(await longPath(missing), missing);
  });
});
