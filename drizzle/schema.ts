import { mysqlTable, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * User table — required by the template's auth infrastructure.
 * Stores OAuth user data.
 */
export const user = mysqlTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
