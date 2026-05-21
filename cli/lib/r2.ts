import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StickerExt } from "../../lib/types.js";

const CONTENT_TYPE: Record<StickerExt, string> = {
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`缺少环境变量 ${name}（请配置 .env.local）`);
  return v;
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  const accountId = envOrThrow("R2_ACCOUNT_ID");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: envOrThrow("R2_ACCESS_KEY_ID"),
      secretAccessKey: envOrThrow("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

export function r2Config() {
  return {
    bucket: envOrThrow("R2_BUCKET"),
    publicHost: envOrThrow("R2_PUBLIC_HOST"),
  };
}

export function publicUrlFor(key: string): string {
  const { publicHost } = r2Config();
  return `https://${publicHost}/${key}`;
}

export async function exists(key: string): Promise<boolean> {
  const { bucket } = r2Config();
  try {
    await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === "NotFound") return false;
    if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
      return false;
    throw e;
  }
}

export async function upload(
  key: string,
  body: Buffer,
  ext: StickerExt,
): Promise<string> {
  const { bucket } = r2Config();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: CONTENT_TYPE[ext],
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return publicUrlFor(key);
}

export async function remove(key: string): Promise<void> {
  const { bucket } = r2Config();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** 从 publicUrl 反推 key（去掉 https://host/ 前缀） */
export function keyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const { publicHost } = r2Config();
    if (u.hostname !== publicHost) return null;
    return u.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}
