export const DEFAULT_R2_PUBLIC_HOST = "s3.yokina.moe";

const HTTPS_PREFIX = "https://";

export function resolveR2PublicHost(value: string | undefined): string {
  const candidate = (value ?? DEFAULT_R2_PUBLIC_HOST).trim().toLowerCase();
  if (!candidate) throw new Error("NEXT_PUBLIC_R2_HOST 不能为空。");

  let url: URL;
  try {
    url = new URL(`${HTTPS_PREFIX}${candidate}`);
  } catch (cause) {
    throw new Error(`NEXT_PUBLIC_R2_HOST 不是有效主机名：${candidate}`, { cause });
  }

  if (!isBareHttpsHostname(url, candidate)) {
    throw new Error(`NEXT_PUBLIC_R2_HOST 必须是纯主机名：${candidate}`);
  }
  return candidate;
}

function isBareHttpsHostname(url: URL, candidate: string): boolean {
  return (
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.host === candidate &&
    url.hostname === candidate &&
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === ""
  );
}
