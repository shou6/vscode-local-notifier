import { MAX_FILE_BYTES, parseNotification } from '../message/parse';
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
}

/** 受信箱のファイルを通知にする */
export class InboxProcessor {
  constructor(private readonly options: InboxProcessorOptions) {}

  /** 受信箱にある候補をすべて処理する */
  async processAll(): Promise<void> {
    let names: string[];
    try {
      names = await this.options.fs.list();
    } catch {
      return;
    }
    for (const name of names) {
      await this.processFile(name);
    }
  }

  /**
   * ファイル 1 つを処理する。失敗しても例外にしない。
   * 先に rename で確保し、確保できたウィンドウだけが読んで消す。
   */
  async processFile(name: string): Promise<void> {
    if (!isCandidate(name)) {
      return;
    }
    const { fs, windowId, project, now, notify } = this.options;
    const claimed = claimedName(name, windowId);
    try {
      const stat = await fs.stat(name);
      await fs.rename(name, claimed);
      if (stat.size > MAX_FILE_BYTES || isStale(stat.mtimeMs, now())) {
        return;
      }
      const result = parseNotification(await fs.read(claimed));
      if (result.ok) {
        const notification = result.notification;
        if (notification.project === undefined && project !== undefined) {
          notification.project = project;
        }
        await notify(notification);
      }
    } catch {
      // ほかのウィンドウに先に取られた、または通知に失敗した
    } finally {
      await fs.delete(claimed).catch(() => undefined);
    }
  }
}
