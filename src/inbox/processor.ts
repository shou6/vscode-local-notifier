import { Notification } from '../message/types';

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
  processAll(): Promise<void> {
    throw new Error('not implemented');
  }

  /** ファイル 1 つを処理する。失敗しても例外にしない */
  processFile(_name: string): Promise<void> {
    throw new Error('not implemented');
  }
}
