#!/usr/bin/env python3
"""
Ghép khung hình JPEG (tên file = mốc thời gian ms, vd 1731641234567.jpg) thành video AVI (MJPEG)
với tốc độ khung hình cố định. Chỉ dùng thư viện chuẩn của Python, không cần ffmpeg.

    python3 scripts/frames-to-avi.py <thư_mục_frames> <file_ra.avi> [fps]

Khung hình từ screencast chỉ phát ra khi màn hình thay đổi, nên script lặp lại khung trước đó
để lấp các khoảng tĩnh, giữ đúng nhịp thời gian thực.
"""
import os
import struct
import sys


def jpeg_size(data):
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        seg_len = struct.unpack(">H", data[i + 2:i + 4])[0]
        i += 2 + seg_len
    raise ValueError("Không đọc được kích thước JPEG")


def chunk(fourcc, payload):
    pad = b"\0" if len(payload) % 2 else b""
    return fourcc + struct.pack("<I", len(payload)) + payload + pad


def lst(kind, payload):
    return b"LIST" + struct.pack("<I", len(payload) + 4) + kind + payload


def main():
    src, out = sys.argv[1], sys.argv[2]
    fps = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    files = sorted((int(os.path.splitext(f)[0]), os.path.join(src, f))
                   for f in os.listdir(src) if f.endswith(".jpg"))
    if not files:
        sys.exit("Không có khung hình")
    t0, t_end = files[0][0], files[-1][0] + 1500       # giữ khung cuối 1,5 giây
    step = 1000 / fps
    frames, k, t = [], 0, t0
    while t <= t_end:
        while k + 1 < len(files) and files[k + 1][0] <= t:
            k += 1
        frames.append(files[k][1])
        t += step
    cache, datas = {}, []
    for p in frames:
        if p not in cache:
            with open(p, "rb") as f:
                cache[p] = f.read()
        datas.append(cache[p])
    w, h = jpeg_size(datas[0])
    n = len(datas)
    max_sz = max(len(d) for d in datas)

    avih = struct.pack("<IIIIIIIIIIIIII", int(1_000_000 / fps), max_sz * fps, 0, 0x10, n, 0, 1,
                       max_sz, w, h, 0, 0, 0, 0)
    strh = struct.pack("<4s4sIHHIIIIIIIIhhhh", b"vids", b"MJPG", 0, 0, 0, 0, 1, fps, 0, n,
                       max_sz, 0xFFFFFFFF, 0, 0, 0, w, h)
    strf = struct.pack("<IiiHH4sIiiII", 40, w, h, 1, 24, b"MJPG", w * h * 3, 0, 0, 0, 0)
    hdrl = lst(b"hdrl", chunk(b"avih", avih) + lst(b"strl", chunk(b"strh", strh) + chunk(b"strf", strf)))

    movi_body, idx, offset = bytearray(), bytearray(), 4
    for d in datas:
        c = chunk(b"00dc", d)
        idx += b"00dc" + struct.pack("<III", 0x10, offset, len(d))
        movi_body += c
        offset += len(c)
    movi = lst(b"movi", bytes(movi_body))
    body = b"AVI " + hdrl + movi + chunk(b"idx1", bytes(idx))
    with open(out, "wb") as f:
        f.write(b"RIFF" + struct.pack("<I", len(body)) + body)
    print(f"{out}: {n} khung, {fps} fps, {n / fps:.1f} giây, {w}x{h}, {os.path.getsize(out) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
