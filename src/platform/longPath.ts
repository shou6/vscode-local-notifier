import { promises as fs } from 'fs';

/**
 * 正式なパスに直す。直せなければ、受け取ったパスをそのまま返す。
 *
 * Windows の短いパス名（8.3 形式。GitHub Actions の一時フォルダ C:\Users\RUNNER~1 など）で
 * フォルダを見張ると、変更の知らせが正式な長いパス名で届き、見張っているパスと一致せずに捨てられた。
 * fs.promises.realpath は OS の機能で正式なパスを求めるので、短いパス名も長いパス名に直る。
 */
export async function longPath(path: string): Promise<string> {
  try {
    return await fs.realpath(path);
  } catch {
    return path;
  }
}
