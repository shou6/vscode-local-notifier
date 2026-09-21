// 拡張機能のアイコン（resources/icon.png）を生成する。
// 使い方: npm run icon
//
// 図案：紺の角丸の正方形に、白いベルと、右へ広がる 2 本の音の波。
// 「作業の区切りで通知が鳴る」ことだけを表す。元の図案（docs/icon_sample.png）にあった
// ロボット、脳、コンテナ、情報と警告の記号は、32px の表示で潰れるため外した。
//
// Marketplace のアイコンは 128px 以上の PNG でなければならない（SVG は受け付けられない）。
// 画像ライブラリに依存せず、Node 標準の zlib だけで PNG を書き出す。
// VS Code のロゴはブランドガイドラインで拡張機能のアイコンへの使用が禁じられているので使わない。
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
/** 縁をなめらかにするため、1 画素を SS x SS に分けて塗り、平均を取る */
const SS = 4;
/** 図形の座標は 1024 x 1024 の下書きの単位で書き、SIZE に縮める */
const UNIT = SIZE / 1024;

/** 背景のグラデーション（上から下へ） */
const BACKGROUND_TOP = [22, 46, 104];
const BACKGROUND_BOTTOM = [10, 20, 52];
/** ベルのグラデーション（上から下へ） */
const BELL_TOP = [255, 255, 255];
const BELL_BOTTOM = [196, 216, 255];
/** 音の波。内側と外側 */
const WAVE_INNER = [56, 189, 248];
const WAVE_OUTER = [37, 150, 235];

/** ベルの中心の x。音の波を右に置くので、少し左に寄せる */
const BELL_X = 470;

/** 角丸の四角までの符号付き距離（内側が負） */
function roundedRectDistance(x, y, [left, top, right, bottom], radius) {
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const qx = Math.abs(x - cx) - ((right - left) / 2 - radius);
  const qy = Math.abs(y - cy) - ((bottom - top) / 2 - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

/** 楕円までの符号付き距離の近似（縁の付近で十分な精度） */
function ellipseDistance(x, y, cx, cy, rx, ry) {
  const k = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
}

/** 凸多角形（頂点は時計回り）までの符号付き距離 */
function convexPolygonDistance(x, y, points) {
  let inside = -Infinity;
  let outside = Infinity;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    const ex = bx - ax;
    const ey = by - ay;
    const length = Math.hypot(ex, ey);
    // 辺の外向きの法線方向の距離（時計回りなので右手側が外）
    const side = ((x - ax) * ey - (y - ay) * ex) / length;
    inside = Math.max(inside, side);
    const t = Math.min(Math.max(((x - ax) * ex + (y - ay) * ey) / (length * length), 0), 1);
    outside = Math.min(outside, Math.hypot(x - (ax + ex * t), y - (ay + ey * t)));
  }
  return inside > 0 ? outside : inside;
}

/** ベルまでの符号付き距離。取っ手、上の丸み、広がる胴、下の縁、舌を合わせた形 */
function bellDistance(x, y) {
  const c = BELL_X;
  return Math.min(
    Math.hypot(x - c, y - 238) - 48,
    ellipseDistance(x, y, c, 425, 190, 175),
    convexPolygonDistance(x, y, [
      [c - 190, 430],
      [c + 190, 430],
      [c + 270, 690],
      [c - 270, 690],
    ]),
    roundedRectDistance(x, y, [c - 300, 640, c + 300, 730], 45),
    ellipseDistance(x, y, c, 765, 80, 65)
  );
}

/** 円弧（線端は丸い）までの符号付き距離。角度は右を 0 度、下向きを正とする */
function arcDistance(x, y, cx, cy, radius, halfWidth, fromDeg, toDeg) {
  const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
  if (angle >= fromDeg && angle <= toDeg) {
    return Math.abs(Math.hypot(x - cx, y - cy) - radius) - halfWidth;
  }
  const end = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return Math.hypot(x - (cx + radius * Math.cos(rad)), y - (cy + radius * Math.sin(rad)));
  };
  return Math.min(end(fromDeg), end(toDeg)) - halfWidth;
}

/** 影。形の縁を中心に blur の幅でぼかす（ガウスぼかしの近似） */
function shadowAlpha(distance, blur, opacity) {
  const t = Math.min(Math.max(0.5 - distance / (2 * blur), 0), 1);
  return opacity * t * t * (3 - 2 * t);
}

/** 縁のなめらかさ。距離が 0 の所で半分の濃さ */
function coverage(distance) {
  return Math.min(Math.max(0.5 - distance / (2 / UNIT / SS), 0), 1);
}

function mix(from, to, t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return from.map((value, i) => value + (to[i] - value) * clamped);
}

/**
 * 下書きの座標 (x, y) の色を、奥の層から順に重ねて求める。
 * 戻り値は [r, g, b, a]（a は 0〜1）。
 */
function colorAt(x, y) {
  let color = [0, 0, 0];
  let alpha = 0;
  const paint = (rgb, a = 1) => {
    if (a <= 0) {
      return;
    }
    const outAlpha = a + alpha * (1 - a);
    color = color.map((value, i) => (rgb[i] * a + value * alpha * (1 - a)) / outAlpha);
    alpha = outAlpha;
  };

  // 背景
  const background = roundedRectDistance(x, y, [0, 0, 1024, 1024], 220);
  if (background > 0) {
    return [0, 0, 0, 0];
  }
  paint(mix(BACKGROUND_TOP, BACKGROUND_BOTTOM, y / 1024));

  // ベルの影
  paint([0, 0, 0], shadowAlpha(bellDistance(x, y - 22), 26, 0.55));

  // 音の波
  const waveX = BELL_X + 250;
  paint(WAVE_INNER, coverage(arcDistance(x, y, waveX, 470, 140, 23, -50, 50)));
  paint(WAVE_OUTER, coverage(arcDistance(x, y, waveX, 470, 240, 23, -50, 50)));

  // ベル
  paint(mix(BELL_TOP, BELL_BOTTOM, (y - 190) / 640), coverage(bellDistance(x, y)));

  return [...color, alpha];
}

function renderPixels() {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let py = 0; py < SIZE; py++) {
    const row = py * (SIZE * 4 + 1);
    raw[row] = 0; // フィルタなし
    for (let px = 0; px < SIZE; px++) {
      // 透明度を掛けた値で平均し、縁が暗くにじまないようにする
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [cr, cg, cb, ca] = colorAt(
            (px + (sx + 0.5) / SS) / UNIT,
            (py + (sy + 0.5) / SS) / UNIT
          );
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const offset = row + 1 + px * 4;
      raw[offset] = a ? Math.round(r / a) : 0;
      raw[offset + 1] = a ? Math.round(g / a) : 0;
      raw[offset + 2] = a ? Math.round(b / a) : 0;
      raw[offset + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return raw;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // ビット深度
header[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', zlib.deflateSync(renderPixels(), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.resolve(__dirname, '../resources/icon.png');
fs.writeFileSync(out, png);
console.log('wrote ' + out + ' (' + SIZE + 'x' + SIZE + ', ' + png.length + ' bytes)');
