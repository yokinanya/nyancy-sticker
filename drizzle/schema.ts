import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const userRole = pgEnum("user_role", ["user", "editor", "admin"]);
export const stickerExt = pgEnum("sticker_ext", ["png", "gif", "webp", "jpg", "jpeg"]);
export const stickerStatus = pgEnum("sticker_status", ["approved", "pending", "rejected"]);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  githubLogin: text("githubLogin").unique(),
  role: userRole("role").notNull().default("user"),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const categories = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    parentId: text("parentId").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    createdById: text("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (cat) => [index("category_parent_idx").on(cat.parentId)],
);

export const stickers = pgTable(
  "sticker",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    src: text("src").notNull(),
    previewSrc: text("previewSrc"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    ext: stickerExt("ext").notNull(),
    hash: text("hash").notNull(),
    categoryId: text("categoryId")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: stickerStatus("status").notNull().default("pending"),
    submittedById: text("submittedById").references(() => users.id, { onDelete: "set null" }),
    approvedById: text("approvedById").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submittedAt", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approvedAt", { mode: "date", withTimezone: true }),
    rejectionReason: text("rejectionReason"),
  },
  (s) => [
    index("sticker_approved_idx")
      .on(s.categoryId)
      .where(sql`${s.status} = 'approved'`),
    index("sticker_pending_idx")
      .on(s.submittedAt)
      .where(sql`${s.status} = 'pending'`),
    index("sticker_tags_gin_idx").using("gin", s.tags),
    uniqueIndex("sticker_hash_active_idx")
      .on(s.hash)
      .where(sql`${s.status} <> 'rejected'`),
  ],
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Sticker = typeof stickers.$inferSelect;
export type NewSticker = typeof stickers.$inferInsert;
