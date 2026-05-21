/* 简化的颜色输出，避免引入 chalk */
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

export const c = {
  ok: (s: string) => `${C.green}${s}${C.reset}`,
  err: (s: string) => `${C.red}${s}${C.reset}`,
  warn: (s: string) => `${C.yellow}${s}${C.reset}`,
  info: (s: string) => `${C.cyan}${s}${C.reset}`,
  dim: (s: string) => `${C.dim}${s}${C.reset}`,
  bold: (s: string) => `${C.bold}${s}${C.reset}`,
};

export function log(...args: unknown[]) {
  console.log(...args);
}
export function fail(msg: string, e?: unknown): never {
  console.error(c.err(`✗ ${msg}`));
  if (e instanceof Error) console.error(c.dim(e.stack ?? e.message));
  process.exit(1);
}
