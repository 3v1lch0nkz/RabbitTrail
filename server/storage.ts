import { 
  User, InsertUser, 
  Project, InsertProject, 
  Entry, InsertEntry,
  ProjectCollaborator, InsertProjectCollaborator,
  ProjectInvitation, InsertProjectInvitation,
  users, projects, projectCollaborators, entries, projectInvitations
} from "@shared/schema";
import crypto from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db, pool } from "./db";
import { eq, and, desc, SQL } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  checkProjectAccess(projectId: number, userId: number): Promise<boolean>;
  
  // Entry methods
  getEntry(id: number): Promise<Entry | undefined>;
  getEntriesByProject(projectId: number): Promise<Entry[]>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  updateEntry(id: number, entry: Partial<Entry>): Promise<Entry>;
  deleteEntry(id: number): Promise<void>;
  
  // Collaborator methods
  getProjectCollaborators(projectId: number): Promise<(ProjectCollaborator & { user: User })[]>;
  addProjectCollaborator(collaborator: InsertProjectCollaborator): Promise<ProjectCollaborator>;
  removeProjectCollaborator(projectId: number, userId: number): Promise<void>;
  
  // Invitation methods
  createProjectInvitation(invitation: Omit<InsertProjectInvitation, "token"> & { invitedBy: number }): Promise<ProjectInvitation>;
  getProjectInvitations(projectId: number): Promise<ProjectInvitation[]>;
  getInvitationByToken(token: string): Promise<ProjectInvitation | undefined>;
  updateInvitationStatus(id: number, status: string): Promise<void>;
  getInvitationByEmail(projectId: number, email: string): Promise<ProjectInvitation | undefined>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private entries: Map<number, Entry>;
  private projectCollaborators: Map<number, ProjectCollaborator>;
  currentUserId: number;
  currentProjectId: number;
  currentEntryId: number;
  currentCollaboratorId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.entries = new Map();
    this.projectCollaborators = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentEntryId = 1;
    this.currentCollaboratorId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    // Get projects owned by the user
    const ownedProjects = Array.from(this.projects.values()).filter(
      (project) => project.ownerId === userId
    );
    
    // Get projects where user is a collaborator
    const collaboratorProjects = Array.from(this.projectCollaborators.values())
      .filter((collab) => collab.userId === userId)
      .map((collab) => this.projects.get(collab.projectId))
      .filter((project): project is Project => !!project);
    
    // Combine and remove duplicates
    const allProjects = [...ownedProjects];
    for (const project of collaboratorProjects) {
      if (!allProjects.some(p => p.id === project.id)) {
        allProjects.push(project);
      }
    }
    
    return allProjects;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const now = new Date();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, updateData: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error("Project not found");
    }
    
    const updatedProject = { ...project, ...updateData };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    // Delete the project
    this.projects.delete(id);
    
    // Delete all entries for this project
    for (const [entryId, entry] of this.entries.entries()) {
      if (entry.projectId === id) {
        this.entries.delete(entryId);
      }
    }
    
    // Delete all collaborators for this project
    for (const [collabId, collab] of this.projectCollaborators.entries()) {
      if (collab.projectId === id) {
        this.projectCollaborators.delete(collabId);
      }
    }
  }

  async checkProjectAccess(projectId: number, userId: number): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;
    
    // Owner has access
    if (project.ownerId === userId) return true;
    
    // Check if user is a collaborator
    const isCollaborator = Array.from(this.projectCollaborators.values()).some(
      (collab) => collab.projectId === projectId && collab.userId === userId
    );
    
    return isCollaborator;
  }

  // Entry methods
  async getEntry(id: number): Promise<Entry | undefined> {
    return this.entries.get(id);
  }

  async getEntriesByProject(projectId: number): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.projectId === projectId
    );
  }

  async createEntry(insertEntry: InsertEntry): Promise<Entry> {
    const id = this.currentEntryId++;
    const now = new Date();
    const entry: Entry = {
      ...insertEntry,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.entries.set(id, entry);
    return entry;
  }

  async updateEntry(id: number, updateData: Partial<Entry>): Promise<Entry> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    const now = new Date();
    const updatedEntry = { 
      ...entry, 
      ...updateData,
      updatedAt: now
    };
    this.entries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteEntry(id: number): Promise<void> {
    this.entries.delete(id);
  }

  // Collaborator methods
  async getProjectCollaborators(projectId: number): Promise<(ProjectCollaborator & { user: User })[]> {
    const collaborators = Array.from(this.projectCollaborators.values()).filter(
      (collab) => collab.projectId === projectId
    );
    
    return collaborators.map(collab => {
      const user = this.users.get(collab.userId);
      if (!user) {
        throw new Error("User not found");
      }
      return { ...collab, user };
    });
  }

  async addProjectCollaborator(insertCollaborator: InsertProjectCollaborator): Promise<ProjectCollaborator> {
    // Check if this user is already a collaborator
    const existingCollaborator = Array.from(this.projectCollaborators.values()).find(
      (collab) => collab.projectId === insertCollaborator.projectId && collab.userId === insertCollaborator.userId
    );
    
    if (existingCollaborator) {
      throw new Error("User is already a collaborator");
    }
    
    const id = this.currentCollaboratorId++;
    const collaborator: ProjectCollaborator = {
      ...insertCollaborator,
      id
    };
    this.projectCollaborators.set(id, collaborator);
    return collaborator;
  }

  async removeProjectCollaborator(projectId: number, userId: number): Promise<void> {
    const collaboratorToRemove = Array.from(this.projectCollaborators.entries()).find(
      ([_, collab]) => collab.projectId === projectId && collab.userId === userId
    );
    
    if (collaboratorToRemove) {
      this.projectCollaborators.delete(collaboratorToRemove[0]);
    }
  }
}

// Database implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Invitation methods
  async createProjectInvitation(
    invitation: Omit<InsertProjectInvitation, "token"> & { invitedBy: number }
  ): Promise<ProjectInvitation> {
    // Generate a secure random token
    const token = Buffer.from(crypto.randomUUID().replace(/-/g, '')).toString('hex');
    
    // Set default expiration 7 days from now if not provided
    const expiresAt = invitation.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const invitationWithToken = {
      projectId: invitation.projectId,
      email: invitation.email,
      role: invitation.role || 'editor',
      token,
      expiresAt
    };
    
    const [createdInvitation] = await db
      .insert(projectInvitations)
      .values(invitationWithToken)
      .returning();
    
    return createdInvitation;
  }
  
  async getProjectInvitations(projectId: number): Promise<ProjectInvitation[]> {
    return db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.projectId, projectId));
  }
  
  async getInvitationByToken(token: string): Promise<ProjectInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.token, token));
    
    return invitation;
  }
  
  async updateInvitationStatus(id: number, status: string): Promise<void> {
    await db
      .update(projectInvitations)
      .set({ status })
      .where(eq(projectInvitations.id, id));
  }
  
  async getInvitationByEmail(projectId: number, email: string): Promise<ProjectInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(projectInvitations)
      .where(and(
        eq(projectInvitations.projectId, projectId),
        eq(projectInvitations.email, email)
      ));
    
    return invitation;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, updateData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    // Get projects owned by the user
    const ownedProjects = await db.select()
      .from(projects)
      .where(eq(projects.ownerId, userId));
    
    // Get projects where user is a collaborator
    const collaborations = await db.select()
      .from(projectCollaborators)
      .where(eq(projectCollaborators.userId, userId));
    
    const collaboratorProjects: Project[] = [];
    // Handle each collaboration individually to avoid the "in" operator
    for (const collab of collaborations) {
      const [project] = await db.select()
        .from(projects)
        .where(eq(projects.id, collab.projectId));
      
      if (project) {
        collaboratorProjects.push(project);
      }
    }
    
    // Combine and remove duplicates
    const seen = new Set<number>();
    const allProjects: Project[] = [];
    
    for (const project of [...ownedProjects, ...collaboratorProjects]) {
      if (!seen.has(project.id)) {
        seen.add(project.id);
        allProjects.push(project);
      }
    }
    
    return allProjects;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const projectWithDefaults = {
      title: insertProject.title,
      ownerId: insertProject.ownerId,
      description: insertProject.description ?? null
    };
    
    const [project] = await db.insert(projects).values(projectWithDefaults).returning();
    return project;
  }

  async updateProject(id: number, updateData: Partial<Project>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();
    
    if (!updatedProject) {
      throw new Error("Project not found");
    }
    
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    // Delete all collaborators for this project first
    await db
      .delete(projectCollaborators)
      .where(eq(projectCollaborators.projectId, id));
    
    // Delete all entries for this project
    await db
      .delete(entries)
      .where(eq(entries.projectId, id));
    
    // Delete the project
    await db
      .delete(projects)
      .where(eq(projects.id, id));
  }

  async checkProjectAccess(projectId: number, userId: number): Promise<boolean> {
    // Check if user is the owner
    const [project] = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.ownerId, userId)
      ));
    
    if (project) return true;
    
    // Check if user is a collaborator
    const [collaborator] = await db
      .select()
      .from(projectCollaborators)
      .where(and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId)
      ));
    
    return !!collaborator;
  }

  // Entry methods
  async getEntry(id: number): Promise<Entry | undefined> {
    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, id));
    
    return entry;
  }

  async getEntriesByProject(projectId: number): Promise<Entry[]> {
    return db
      .select()
      .from(entries)
      .where(eq(entries.projectId, projectId))
      .orderBy(desc(entries.createdAt));
  }

  async createEntry(insertEntry: InsertEntry): Promise<Entry> {
    // Normalize NULL values for optional fields
    const entryData = {
      title: insertEntry.title,
      projectId: insertEntry.projectId,
      createdById: insertEntry.createdById,
      description: insertEntry.description ?? null,
      latitude: insertEntry.latitude ?? null,
      longitude: insertEntry.longitude ?? null,
      mediaUrlImage: insertEntry.mediaUrlImage ?? null,
      mediaUrlAudio: insertEntry.mediaUrlAudio ?? null,
      // Ensure links is properly converted to JSONB - null if not provided
      links: insertEntry.links ? JSON.stringify(insertEntry.links) : null
    };
    
    const [entry] = await db
      .insert(entries)
      .values(entryData)
      .returning();
    
    return entry;
  }

  async updateEntry(id: number, updateData: Partial<Entry>): Promise<Entry> {
    const now = new Date();
    
    // Process the links field if it exists
    const processedData = { ...updateData };
    
    if (processedData.links !== undefined) {
      // If links is provided, stringify it for JSONB
      processedData.links = processedData.links ? JSON.stringify(processedData.links) : null;
    }
    
    const [updatedEntry] = await db
      .update(entries)
      .set({
        ...processedData,
        updatedAt: now
      })
      .where(eq(entries.id, id))
      .returning();
    
    if (!updatedEntry) {
      throw new Error("Entry not found");
    }
    
    return updatedEntry;
  }

  async deleteEntry(id: number): Promise<void> {
    await db
      .delete(entries)
      .where(eq(entries.id, id));
  }

  // Collaborator methods
  async getProjectCollaborators(projectId: number): Promise<(ProjectCollaborator & { user: User })[]> {
    // Joint query to get collaborators and their user details
    const result = await db
      .select({
        collaborator: projectCollaborators,
        user: users
      })
      .from(projectCollaborators)
      .innerJoin(users, eq(projectCollaborators.userId, users.id))
      .where(eq(projectCollaborators.projectId, projectId));
    
    return result.map(row => ({
      ...row.collaborator,
      user: row.user
    }));
  }

  async addProjectCollaborator(insertCollaborator: InsertProjectCollaborator): Promise<ProjectCollaborator> {
    // Check if this user is already a collaborator
    const [existingCollaborator] = await db
      .select()
      .from(projectCollaborators)
      .where(and(
        eq(projectCollaborators.projectId, insertCollaborator.projectId),
        eq(projectCollaborators.userId, insertCollaborator.userId)
      ));
    
    if (existingCollaborator) {
      throw new Error("User is already a collaborator");
    }
    
    // Normalize with default role if not provided
    const collaboratorWithDefaults = {
      projectId: insertCollaborator.projectId,
      userId: insertCollaborator.userId,
      role: insertCollaborator.role ?? 'editor'
    };
    
    const [collaborator] = await db
      .insert(projectCollaborators)
      .values(collaboratorWithDefaults)
      .returning();
    
    return collaborator;
  }

  async removeProjectCollaborator(projectId: number, userId: number): Promise<void> {
    await db
      .delete(projectCollaborators)
      .where(and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId)
      ));
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
