import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archived: boolean("archived").default(false),
  archivedAt: timestamp("archived_at"),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  description: true,
  ownerId: true,
});

// Project Collaborators
export const projectCollaborators = pgTable("project_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("editor"), // "editor" or "viewer"
});

export const insertProjectCollaboratorSchema = createInsertSchema(projectCollaborators).pick({
  projectId: true,
  userId: true,
  role: true,
});

// Project Invitations
export const projectInvitations = pgTable("project_invitations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("editor"),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "expired"
});

export const insertProjectInvitationSchema = createInsertSchema(projectInvitations).pick({
  projectId: true,
  email: true,
  role: true,
  token: true,
  expiresAt: true,
});

// Entries
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  mediaUrlImage: text("media_url_image"),
  mediaUrlAudio: text("media_url_audio"),
  links: json("links").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEntrySchema = createInsertSchema(entries).pick({
  projectId: true,
  createdById: true,
  title: true,
  description: true,
  latitude: true,
  longitude: true,
  mediaUrlImage: true,
  mediaUrlAudio: true,
  links: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type InsertProjectCollaborator = z.infer<typeof insertProjectCollaboratorSchema>;

export type ProjectInvitation = typeof projectInvitations.$inferSelect;
export type InsertProjectInvitation = z.infer<typeof insertProjectInvitationSchema>;

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
