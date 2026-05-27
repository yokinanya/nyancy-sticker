import "dotenv/config";

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_MODEL = "google/gemini-3.5-flash";
const VERCEL_AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const MAX_BASENAME_LENGTH = 48;
const MAX_IMAGE_SIZE = 512;
const PNG_MIME = "image/png";

interface CliOptions {
  apply: boolean;
  dir: string;
  model: string;
  recursive: boolean;
}

interface RenamePlan {
  from: string;
  to: string;
  reason: string;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
  if (!apiKey) throw new Error("缺少环境变量 AI_GATEWAY_API_KEY。");
  console.log(`扫描目录：${options.dir}`);
  console.log(`模型：${options.model}`);
  console.log(`模式：${options.apply ? "实际重命名" : "dry-run"}`);
  const files = await listImages(options.dir, options.recursive);
  if (files.length === 0) throw new Error(`目录中没有可识别图片：${options.dir}`);
  console.log(`找到 ${files.length} 张图片。`);
  const plans = await buildRenamePlans(files, options.model, apiKey);
  await printAndApply(plans, options.apply);
}

function parseArgs(args: string[]): CliOptions {
  const normalizedArgs = args.filter((arg) => arg !== "--");
  const dir = normalizedArgs.find((arg) => !arg.startsWith("--"));
  if (!dir) {
    throw new Error("用法：pnpm rename:stickers -- <目录> [--apply] [--recursive] [--model google/gemini-3.5-flash]");
  }
  return {
    apply: normalizedArgs.includes("--apply"),
    dir: path.resolve(dir),
    model: readFlag(normalizedArgs, "--model") ?? process.env.VERCEL_IMAGE_RENAME_MODEL ?? DEFAULT_MODEL,
    recursive: normalizedArgs.includes("--recursive"),
  };
}

function readFlag(args: readonly string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} 缺少值。`);
  return value;
}

async function listImages(dir: string, recursive: boolean): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive) files.push(...(await listImages(fullPath, true)));
    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function buildRenamePlans(
  files: readonly string[],
  model: string,
  apiKey: string,
): Promise<RenamePlan[]> {
  const plans: RenamePlan[] = [];
  const reserved = new Set(files.map((file) => path.resolve(file)));
  for (const [index, file] of files.entries()) {
    console.log(`[${index + 1}/${files.length}] 识别 ${path.basename(file)}...`);
    const suggestion = await suggestName(file, model, apiKey);
    const to = await uniqueTargetPath(file, suggestion.name, reserved);
    reserved.add(path.resolve(to));
    console.log(`  -> ${path.basename(to)}${suggestion.reason ? `（${suggestion.reason}）` : ""}`);
    plans.push({ from: file, to, reason: suggestion.reason });
  }
  return plans;
}

async function suggestName(
  file: string,
  model: string,
  apiKey: string,
): Promise<{ name: string; reason: string }> {
  const image = await previewDataUrl(file);
  const response = await fetch(VERCEL_AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody(model, image)),
  });
  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    const message = json.error?.message ?? `Vercel AI Gateway HTTP ${response.status}`;
    throw new Error(`${path.basename(file)} 使用模型 ${model} 识别失败：${message}`);
  }
  return parseSuggestion(json.choices?.[0]?.message?.content ?? "");
}

function requestBody(model: string, imageUrl: string): object {
  return {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: renamePrompt() },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        ],
      },
    ],
  };
}

function renamePrompt(): string {
  return [
    "识别这张表情包图片，并为它生成一个短文件名。",
    "要求：中文优先，2 到 8 个字，描述表情/动作/情绪，不要扩展名。",
    "不要包含斜杠、引号、emoji、标点或多余解释。",
    "只输出 JSON：{\"name\":\"文件名\",\"reason\":\"一句话依据\"}",
  ].join("\n");
}

async function previewDataUrl(file: string): Promise<string> {
  const buffer = await sharp(file, { animated: false })
    .resize({ width: MAX_IMAGE_SIZE, height: MAX_IMAGE_SIZE, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:${PNG_MIME};base64,${buffer.toString("base64")}`;
}

function parseSuggestion(text: string): { name: string; reason: string } {
  const parsed = JSON.parse(jsonText(text)) as { name?: unknown; reason?: unknown };
  if (typeof parsed.name !== "string" || !parsed.name.trim()) {
    throw new Error(`模型返回缺少 name：${text}`);
  }
  return {
    name: sanitizeBaseName(parsed.name),
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
  };
}

function jsonText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function sanitizeBaseName(value: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, MAX_BASENAME_LENGTH)
    .trim();
  if (!cleaned) throw new Error(`模型返回的文件名不可用：${value}`);
  return cleaned;
}

async function uniqueTargetPath(file: string, baseName: string, reserved: Set<string>): Promise<string> {
  const dir = path.dirname(file);
  const ext = path.extname(file).toLowerCase();
  for (let index = 0; ; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const candidate = path.join(dir, `${baseName}${suffix}${ext}`);
    const resolved = path.resolve(candidate);
    if (resolved === path.resolve(file)) return candidate;
    if (!reserved.has(resolved) && !(await pathExists(candidate))) return candidate;
  }
}

async function pathExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function printAndApply(plans: readonly RenamePlan[], apply: boolean): Promise<void> {
  let changed = 0;
  for (const plan of plans) {
    console.log(`${apply ? "RENAME" : "DRY"} ${plan.from} -> ${plan.to}`);
    if (plan.reason) console.log(`  ${plan.reason}`);
    if (path.resolve(plan.from) === path.resolve(plan.to)) continue;
    changed += 1;
    if (apply) await fs.rename(plan.from, plan.to);
  }
  if (!apply) console.log("未改名。确认无误后加 --apply 执行。");
  console.log(`完成：${plans.length} 张图片，${changed} 个文件名需要变更。`);
}
