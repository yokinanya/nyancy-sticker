"use client";

/**
 * 提供三种动作：复制图片本体（image/png）、复制 URL、下载。
 * 浏览器兼容性：Clipboard API 在大多数现代浏览器支持，但 iOS Safari 仅 PNG，且必须由用户手势触发。
 */

export type CopyImageResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "fetch-failed" | "denied" | "decode-failed" };

async function fetchAsPngBlob(src: string): Promise<Blob> {
  const res = await fetch(src, { mode: "cors" });
  if (!res.ok) throw new Error("fetch-failed");
  const blob = await res.blob();
  if (blob.type === "image/png") return blob;
  // 非 PNG（如 GIF/WebP），用 canvas 转为 PNG（GIF 会只保留首帧）
  return await new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("decode-failed"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("decode-failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = URL.createObjectURL(blob);
  });
}

export async function copyImage(src: string): Promise<CopyImageResult> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const blob = await fetchAsPngBlob(src);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "fetch-failed") return { ok: false, reason: "fetch-failed" };
    if (msg === "decode-failed") return { ok: false, reason: "decode-failed" };
    return { ok: false, reason: "denied" };
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function downloadFile(src: string, filename: string) {
  // 走服务端代理，统一加 Content-Disposition: attachment，避免跨域 <a download> 被忽略。
  const proxied = `/api/download?url=${encodeURIComponent(src)}&name=${encodeURIComponent(filename)}`;
  const a = document.createElement("a");
  a.href = proxied;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
