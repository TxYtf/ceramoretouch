import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // e.g. "ORD-123456"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").default("new").notNull(), // 'new' | 'processing' | 'completed' | 'cancelled'
  fullName: text("full_name").notNull(),
  phoneMessenger: text("phone_messenger").notNull(),
  phoneBackup: text("phone_backup"),
  email: text("email"),
  retouchRequirements: text("retouch_requirements"),
  ceramicShape: text("ceramic_shape").notNull(),
  ceramicShapeCustom: text("ceramic_shape_custom"),
  ceramicBevel: text("ceramic_bevel"),
  ceramicSize: text("ceramic_size").notNull(),
  ceramicSizeCustom: text("ceramic_size_custom"),
  backgroundRequirements: text("background_requirements").notNull(),
  photoFile: jsonb("photo_file").notNull(), // Stores { name: string, base64: string, type: string }
});
