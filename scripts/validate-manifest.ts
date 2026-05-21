#!/usr/bin/env tsx
/**
 * 构建期 manifest 校验，被 package.json 的 prebuild 调用。
 * 等价于 `pnpm sticker validate`，但允许独立运行以避免在生产环境拉 CLI 依赖。
 */
import { validateCommand } from "../cli/commands/validate.js";

validateCommand({ checkRemote: false }).catch((e) => {
  console.error(e);
  process.exit(1);
});
