import { MAX_FILE_BYTES, parseNotification } from '../message/parse';
import { Presets } from '../message/preset';
import { Notification } from '../message/types';
import { claimedName, isCandidate, isStale } from './policy';

/** 受信箱 1 つに対するファイル操作。名前は受信箱の中のファイル名 */
export interface InboxFileSystem {
  list(): Promise<string[]>;
  stat(name: string): Promise<{ mtimeMs: number; size: number }>;
  /** 移動先が既にある、または移動元が無い時は失敗する */
  rename(from: string, to: string): Promise<void>;
  read(name: string): Promise<string>;
  delete(name: string): Promise<void>;
}

export interface InboxProcessorOptions {
  fs: InboxFileSystem;
  /** ウィンドウごとの識別子。取り合いで確保した名前に入れる */
  windowId: string;
  /** 通知に project が無い時に補うプロジェクト名 */
  project?: string;
  now: () => number;
  notify: (notification: Notification) => Promise<void>;
  /** 通知の定義。preset の解決に使う */
  presets?: Presets;
  /** 存在しない定義の名前が来た時に呼ぶ */
  onUnknownPreset?: (name: string) => void;
  /** 処理の記録。調査のため、ファイル 1 件ごとの結果を 1 行ずつ渡す */
  log?: (line: string) => void;
}

/** ファイルを拾ったきっかけ。変更の知らせ、定期的な確認、起動時の処理 */
export type Trigger = 'event' | 'poll' | 'startup';

/** 受信箱のファイルを通知にする */
export class InboxProcessor {
  /** 実行中の processAll。定期的な確認が重なった時は、これを返して重ねない */
  private running: Promise<void> | undefined;

  constructor(private readonly options: InboxProcessorOptions) {}

  /** 受信箱にある候補をすべて処理する */
  processAll(trigger: Trigger = 'startup'): Promise<void> {
    this.running ??= this.processAllOnce(trigger).finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async processAllOnce(trigger: Trigger): Promise<void> {
    let names: string[];
    try {
      names = await this.options.fs.list();
    } catch {
      return;
    }
    for (const name of names) {
      await this.processFile(name, trigger);
    }
  }

  /**
   * ファイル 1 つを処理する。失敗しても例外にしない。
   * 先に rename で確保し、確保できたウィンドウだけが読んで消す。
   */
  async processFile(name: string, trigger: Trigger = 'event'): Promise<void> {
    if (!isCandidate(name)) {
      return;
    }
    const { fs, windowId, project, now, notify, presets, onUnknownPreset } = this.options;
    const log = (message: string): void =>
      this.options.log?.(trigger + ' ' + name + ': ' + message);
    const claimed = claimedName(name, windowId);
    let owned = false;
    try {
      let stat: { mtimeMs: number; size: number };
      try {
        stat = await fs.stat(name);
        await fs.rename(name, claimed);
      } catch (error) {
        log('not claimed (' + errorMessage(error) + ')');
        return;
      }
      owned = true;
      log('claimed');
      if (stat.size > MAX_FILE_BYTES) {
        log('discarded (too-large)');
        return;
      }
      if (isStale(stat.mtimeMs, now())) {
        log('discarded (stale)');
        return;
      }
      const result = parseNotification(await fs.read(claimed), presets);
      if (!result.ok) {
        log('discarded (' + result.reason + ')');
        if (result.reason === 'unknown-preset') {
          onUnknownPreset?.(result.preset);
        }
        return;
      }
      const notification = result.notification;
      if (notification.project === undefined && project !== undefined) {
        notification.project = project;
      }
      try {
        await notify(notification);
        log('notified ' + JSON.stringify(notification.title));
      } catch (error) {
        log('notify failed (' + errorMessage(error) + ')');
      }
    } catch (error) {
      log('failed (' + errorMessage(error) + ')');
    } finally {
      // 確保できた時だけ消す。確保できなかった時に消すと、同じ名前で確保した処理のファイルを消してしまう
      if (owned) {
        await fs.delete(claimed).catch(() => undefined);
      }
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
