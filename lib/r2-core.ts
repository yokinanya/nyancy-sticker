import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHash, createHmac } from "node:crypto";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { StickerExt } from "@/lib/types";

const R2_REGION = "auto";
const R2_SERVICE = "s3";
const PRESIGNED_PAYLOAD_HASH = "UNSIGNED-PAYLOAD";

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
    region: R2_REGION,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: envOrThrow("R2_ACCESS_KEY_ID"),
      secretAccessKey: envOrThrow("R2_SECRET_ACCESS_KEY"),
    },
    requestHandler: createRequestHandler(),
  });
  return _client;
}

function createRequestHandler() {
  const proxyUrl = process.env.R2_PROXY_URL;
  if (!proxyUrl) return undefined;
  const agent = new HttpsProxyAgent(proxyUrl);
  return new NodeHttpHandler({
    httpAgent: agent,
    httpsAgent: agent,
  });
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
    if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw e;
  }
}

export async function upload(key: string, body: Buffer, ext: StickerExt): Promise<string> {
  return putObject(key, body, CONTENT_TYPE[ext]);
}

export async function uploadWebp(key: string, body: Buffer): Promise<string> {
  return putObject(key, body, "image/webp");
}

export async function presignedPutObjectUrl(options: {
  key: string;
  contentType: string;
  cacheControl: string;
  expiresInSeconds: number;
}): Promise<string> {
  const accountId = envOrThrow("R2_ACCOUNT_ID");
  const credentials = r2Credentials();
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${r2Config().bucket}/${options.key}`);
  const now = new Date();
  const amzDate = amzDateStamp(now);
  const date = amzDate.slice(0, 8);
  const signedHeaders = "cache-control;content-type;host";
  const scope = `${date}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  setPresignParams(url, credentials.accessKeyId, scope, amzDate, options.expiresInSeconds, signedHeaders);
  const canonical = canonicalRequest(url, options.contentType, options.cacheControl, signedHeaders);
  const signature = signPresignedRequest(credentials.secretAccessKey, date, amzDate, scope, canonical);
  url.searchParams.set("X-Amz-Signature", signature);
  return url.toString();
}

export async function copy(sourceKey: string, targetKey: string): Promise<string> {
  const { bucket } = r2Config();
  await client().send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${encodeURI(sourceKey)}`,
      Key: targetKey,
      CacheControl: "public, max-age=31536000, immutable",
      MetadataDirective: "COPY",
    }),
  );
  return publicUrlFor(targetKey);
}

export async function download(key: string): Promise<{
  buffer: Buffer;
  contentLength: number | null;
  contentType: string | null;
}> {
  const { bucket } = r2Config();
  const result = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error(`R2 对象内容为空：${key}`);
  const bytes = await result.Body.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentLength: result.ContentLength ?? null,
    contentType: result.ContentType ?? null,
  };
}

async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const { bucket } = r2Config();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return publicUrlFor(key);
}

function r2Credentials() {
  return {
    accessKeyId: envOrThrow("R2_ACCESS_KEY_ID"),
    secretAccessKey: envOrThrow("R2_SECRET_ACCESS_KEY"),
  };
}

function setPresignParams(
  url: URL,
  accessKeyId: string,
  scope: string,
  amzDate: string,
  expiresInSeconds: number,
  signedHeaders: string,
) {
  url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  url.searchParams.set("X-Amz-Credential", `${accessKeyId}/${scope}`);
  url.searchParams.set("X-Amz-Date", amzDate);
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  url.searchParams.set("X-Amz-SignedHeaders", signedHeaders);
}

function canonicalRequest(
  url: URL,
  contentType: string,
  cacheControl: string,
  signedHeaders: string,
): string {
  return [
    "PUT",
    url.pathname,
    canonicalQueryString(url),
    `cache-control:${cacheControl}\ncontent-type:${contentType}\nhost:${url.host}\n`,
    signedHeaders,
    PRESIGNED_PAYLOAD_HASH,
  ].join("\n");
}

function canonicalQueryString(url: URL): string {
  return [...url.searchParams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
}

function signPresignedRequest(
  secretAccessKey: string,
  date: string,
  amzDate: string,
  scope: string,
  canonical: string,
): string {
  const requestHash = sha256Hex(canonical);
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, requestHash].join("\n");
  return hmac(signingKey(secretAccessKey, date), stringToSign).toString("hex");
}

function signingKey(secretAccessKey: string, date: string): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, R2_REGION);
  const serviceKey = hmac(regionKey, R2_SERVICE);
  return hmac(serviceKey, "aws4_request");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function amzDateStamp(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function remove(key: string): Promise<void> {
  const { bucket } = r2Config();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function keyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const { publicHost } = r2Config();
    if (u.hostname !== publicHost) return null;
    return decodeURIComponent(u.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}
