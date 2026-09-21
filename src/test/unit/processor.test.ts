import * as assert from 'assert';
import { InboxFileSystem, InboxProcessor } from '../../inbox/processor';
import { MAX_AGE_MS } from '../../inbox/policy';
import { MAX_FILE_BYTES } from '../../message/parse';
import { Notification } from '../../message/types';

const NOW = 1_000_000_000;

interface FakeFile {
  text: string;
  mtimeMs: number;
}

/** メモリ上の受信箱。rename は相手が無ければ失敗する（取り合いに負けた時と同じ） */
function fakeInbox(files: Record<string, FakeFile>): InboxFileSystem & {
  files: Map<string, FakeFile>;
} {
  const map = new Map(Object.entries(files));
  return {
    files: map,
    list: () => Promise.resolve([...map.keys()]),
    stat(name) {
      const file = map.get(name);
      return file
        ? Promise.resolve({ mtimeMs: file.mtimeMs, size: Buffer.byteLength(file.text) })
        : Promise.reject(new Error('ENOENT'));
    },
    rename(from, to) {
      const file = map.get(from);
      if (!file) {
        return Promise.reject(new Error('ENOENT'));
      }
      map.delete(from);
      map.set(to, file);
      return Promise.resolve();
    },
    read(name) {
      const file = map.get(name);
      return file ? Promise.resolve(file.text) : Promise.reject(new Error('ENOENT'));
    },
    delete(name) {
      map.delete(name);
      return Promise.resolve();
    },
  };
}

function processor(
  inbox: InboxFileSystem,
  project?: string
): { target: InboxProcessor; shown: Notification[] } {
  const shown: Notification[] = [];
  const target = new InboxProcessor({
    fs: inbox,
    windowId: 'w1',
    project,
    now: () => NOW,
    notify: (notification) => {
      shown.push(notification);
      return Promise.resolve();
    },
  });
  return { target, shown };
}

const VALID = '{"title":"Done","message":"Finished"}';

suite('InboxProcessor.processFile', () => {
  test('新しいファイルを通知し、受信箱から消す', async () => {
    const inbox = fakeInbox({ 'a.json': { text: VALID, mtimeMs: NOW } });
    const { target, shown } = processor(inbox);
    await target.processFile('a.json');
    assert.deepStrictEqual(shown, [{ title: 'Done', message: 'Finished' }]);
    assert.deepStrictEqual([...inbox.files.keys()], []);
  });

  test('project が無ければ、受信箱のプロジェクト名で補う', async () => {
    const inbox = fakeInbox({ 'a.json': { text: VALID, mtimeMs: NOW } });
    const { target, shown } = processor(inbox, 'app');
    await target.processFile('a.json');
    assert.strictEqual(shown[0].project, 'app');
  });

  test('project があれば、そちらを優先する', async () => {
    const text = '{"title":"T","message":"M","project":"mine"}';
    const inbox = fakeInbox({ 'a.json': { text, mtimeMs: NOW } });
    const { target, shown } = processor(inbox, 'app');
    await target.processFile('a.json');
    assert.strictEqual(shown[0].project, 'mine');
  });

  test('候補でないファイル（書きかけの一時ファイルなど）には触らない', async () => {
    const inbox = fakeInbox({ '.tmp-1.json': { text: VALID, mtimeMs: NOW } });
    const { target, shown } = processor(inbox);
    await target.processFile('.tmp-1.json');
    assert.deepStrictEqual(shown, []);
    assert.deepStrictEqual([...inbox.files.keys()], ['.tmp-1.json']);
  });

  test('古いファイルは通知せずに消す', async () => {
    const inbox = fakeInbox({ 'a.json': { text: VALID, mtimeMs: NOW - MAX_AGE_MS - 1 } });
    const { target, shown } = processor(inbox);
    await target.processFile('a.json');
    assert.deepStrictEqual(shown, []);
    assert.deepStrictEqual([...inbox.files.keys()], []);
  });

  test('大きすぎるファイルは読まずに消す', async () => {
    const inbox = fakeInbox({ 'a.json': { text: 'x'.repeat(MAX_FILE_BYTES + 1), mtimeMs: NOW } });
    const { target, shown } = processor(inbox);
    await target.processFile('a.json');
    assert.deepStrictEqual(shown, []);
    assert.deepStrictEqual([...inbox.files.keys()], []);
  });

  test('形式が正しくないファイルは通知せずに消す', async () => {
    const inbox = fakeInbox({ 'a.json': { text: '{"title":"T"}', mtimeMs: NOW } });
    const { target, shown } = processor(inbox);
    await target.processFile('a.json');
    assert.deepStrictEqual(shown, []);
    assert.deepStrictEqual([...inbox.files.keys()], []);
  });

  test('ほかのウィンドウに先に取られていたら、何もしない', async () => {
    const inbox = fakeInbox({});
    const { target, shown } = processor(inbox);
    await target.processFile('a.json');
    assert.deepStrictEqual(shown, []);
  });

  test('2 つのウィンドウが同じファイルを処理しても、通知は 1 回だけ', async () => {
    const inbox = fakeInbox({ 'a.json': { text: VALID, mtimeMs: NOW } });
    const first = processor(inbox);
    const second = processor(inbox);
    await Promise.all([first.target.processFile('a.json'), second.target.processFile('a.json')]);
    assert.strictEqual(first.shown.length + second.shown.length, 1);
  });

  test('通知に失敗しても例外にしない', async () => {
    const inbox = fakeInbox({ 'a.json': { text: VALID, mtimeMs: NOW } });
    const target = new InboxProcessor({
      fs: inbox,
      windowId: 'w1',
      now: () => NOW,
      notify: () => Promise.reject(new Error('boom')),
    });
    await target.processFile('a.json');
    assert.deepStrictEqual([...inbox.files.keys()], []);
  });
});

suite('InboxProcessor.processAll', () => {
  test('受信箱にある候補をすべて処理する（起動時に溜まっていた分）', async () => {
    const inbox = fakeInbox({
      'a.json': { text: VALID, mtimeMs: NOW },
      'b.json': { text: VALID, mtimeMs: NOW - MAX_AGE_MS - 1 },
      '.gitignore': { text: '*', mtimeMs: NOW },
    });
    const { target, shown } = processor(inbox);
    await target.processAll();
    assert.strictEqual(shown.length, 1);
    assert.deepStrictEqual([...inbox.files.keys()], ['.gitignore']);
  });

  test('受信箱が読めなくても例外にしない', async () => {
    const inbox = fakeInbox({});
    inbox.list = () => Promise.reject(new Error('ENOENT'));
    const { target } = processor(inbox);
    await target.processAll();
  });
});
