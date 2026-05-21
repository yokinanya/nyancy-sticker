#!/usr/bin/env node
import "dotenv/config";
import { cac } from "cac";
import { addCommand } from "./commands/add.js";
import { bulkImportCommand } from "./commands/bulk-import.js";
import { editCommand } from "./commands/edit.js";
import { rmCommand } from "./commands/rm.js";
import { listCommand } from "./commands/list.js";
import { tagCommand } from "./commands/tag.js";
import { validateCommand } from "./commands/validate.js";
import {
  categoriesAdd,
  categoriesRm,
  categoriesList,
} from "./commands/categories.js";
import { fail } from "./lib/log.js";

const cli = cac("sticker");

cli
  .command("add <files...>", "添加一张或多张表情包（交互式）")
  .option("--category <id>", "指定分类，跳过询问")
  .option("--name <name>", "指定名称")
  .option("--tags <list>", "标签，逗号分隔")
  .option("-y, --yes", "跳过所有确认")
  .option("--dry-run", "不上传 R2、不写 manifest，仅打印")
  .action(addCommand);

cli
  .command("bulk-import <dir>", "批量导入目录里的所有图片")
  .option("--category <id>", "全部归到该分类")
  .option("--category-from-dir", "用一级子目录名作为分类（须已存在）")
  .option("-y, --yes", "对每张图都用默认值")
  .option("--dry-run", "不上传、不写")
  .action(bulkImportCommand);

cli.command("edit <id>", "编辑某张表情包的元数据").action(editCommand);

cli
  .command("rm <id>", "从 manifest 删除一张表情包")
  .option("--purge", "同时删除 R2 对象")
  .option("-y, --yes", "跳过确认")
  .action(rmCommand);

cli
  .command("list", "列出表情包")
  .option("--category <id>", "按分类过滤")
  .option("--tag <tag>", "按标签过滤")
  .option("--limit <n>", "显示数量", { default: 50 })
  .action(listCommand);

cli
  .command("tag <id> <tags...>", "为某张表情快速添加标签")
  .action(tagCommand);

cli
  .command("validate", "校验 manifest（id 唯一/分类引用/hash 重复）")
  .option("--check-remote", "同时 HEAD 检查 R2 URL 是否可达（慢）")
  .action(validateCommand);

cli
  .command("categories", "列出所有分类")
  .action(categoriesList);
cli.command("categories:add", "新增分类").action(categoriesAdd);
cli.command("categories:rm <id>", "删除分类").action(categoriesRm);

cli.help();
cli.version("0.1.0");

try {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
} catch (e) {
  fail((e as Error).message, e);
}
