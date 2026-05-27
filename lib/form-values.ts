export function parseRequiredInteger(value: string, key: string): number {
  if (!/^-?\d+$/.test(value)) throw new Error(`字段必须是整数：${key}`);
  return Number.parseInt(value, 10);
}
