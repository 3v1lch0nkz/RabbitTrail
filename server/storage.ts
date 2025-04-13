import { users, type User, type InsertUser, projects, type Project, type InsertProject, projectCollaborators, type ProjectCollaborator, type InsertProjectCollaborator, entries, type Entry, type InsertEntry } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  getSharedProjectsByUserId(userId: number): Promise<Project[]>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Project collaborator operations
  addCollaborator(collaborator: InsertProjectCollaborator): Promise<ProjectCollaborator>;
  getCollaborators(projectId: number): Promise<ProjectCollaborator[]>;
  removeCollaborator(projectId: number, userId: number): Promise<void>;
  updateCollaboratorRole(projectId: number, userId: number, role: string): Promise<ProjectCollaborator>;
  getCollaboratorRole(projectId: number, userId: number): Promise<string | undefined>;

  // Entry operations
  createEntry(entry: InsertEntry): Promise<Entry>;
  getEntry(id: number): Promise<Entry | undefined>;
  getEntriesByProjectId(projectId: number): Promise<Entry[]>;
  updateEntry(id: number, entry: Partial<InsertEntry>): Promise<Entry>;
  deleteEntry(id: number): Promise<void>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private projectCollaborators: Map<number, ProjectCollaborator>;
  private entries: Map<number, Entry>;
  
  sessionStore: session.SessionStore;
  
  private userId = 1;
  private projectId = 1;
  private collaboratorId = 1;
  private entryId = 1;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.projectCollaborators = new Map();
    this.entries = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const timestamp = new Date();
    const newUser: User = { ...user, id, createdAt: timestamp };
    this.users.set(id, newUser);
    return newUser;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const timestamp = new Date();
    const newProject: Project = { ...project, id, createdAt: timestamp };
    this.projects.set(id, newProject);
    
    // Automatically add owner as a collaborator with owner role
    await this.addCollaborator({
      projectId: id,
      userId: project.ownerId,
      role: "owner"
    });
    
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.ownerId === userId
    );
  }

  async getSharedProjectsByUserId(userId: number): Promise<Project[]> {
    // Get all project IDs where user is a collaborator but not owner
    const collaboratorProjectIds = Array.from(this.projectCollaborators.values())
      .filter(collab => collab.userId === userId && collab.role !== "owner")
      .map(collab => collab.projectId);
    
    // Get all projects with those IDs
    return Array.from(this.projects.values())
      .filter(project => collaboratorProjectIds.includes(project.id));
  }

  async updateProject(id: number, projectUpdate: Partial<InsertProject>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error("Project not found");
    }
    
    const updatedProject = { ...project, ...projectUpdate };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    // Delete all collaborators associated with this project
    Array.from(this.projectCollaborators.values())
      .filter(collab => collab.projectId === id)
      .forEach(collab => this.projectCollaborators.delete(collab.id));
    
    // Delete all entries associated with this project
    Array.from(this.entries.values())
      .filter(entry => entry.projectId === id)
      .forEach(entry => this.entries.delete(entry.id));
    
    // Delete the project
    this.projects.delete(id);
  }

  // Project collaborator operations
  async addCollaborator(collaborator: InsertProjectCollaborator): Promise<ProjectCollaborator> {
    const id = this.collaboratorId++;
    const newCollaborator: ProjectCollaborator = { ...collaborator, id };
    this.projectCollaborators.set(id, newCollaborator);
    return newCollaborator;
  }

  async getCollaborators(projectId: number): Promise<ProjectCollaborator[]> {
    return Array.from(this.projectCollaborators.values()).filter(
      (collab) => collab.projectId === projectId
    );
  }

  async removeCollaborator(projectId: number, userId: number): Promise<void> {
    const collaborator = Array.from(this.projectCollaborators.values()).find(
      (collab) => collab.projectId === projectId && collab.userId === userId
    );
    
    if (collaborator) {
      this.projectCollaborators.delete(collaborator.id);
    }
  }

  async updateCollaboratorRole(projectId: number, userId: number, role: string): Promise<ProjectCollaborator> {
    const collaborator = Array.from(this.projectCollaborators.values()).find(
      (collab) => collab.projectId === projectId && collab.userId === userId
    );
    
    if (!collaborator) {
      throw new Error("Collaborator not found");
    }
    
    const updatedCollaborator = { ...collaborator, role };
    this.projectCollaborators.set(collaborator.id, updatedCollaborator);
    return updatedCollaborator;
  }

  async getCollaboratorRole(projectId: number, userId: number): Promise<string | undefined> {
    const collaborator = Array.from(this.projectCollaborators.values()).find(
      (collab) => collab.projectId === projectId && collab.userId === userId
    );
    
    return collaborator?.role;
  }

  // Entry operations
  async createEntry(entry: InsertEntry): Promise<Entry> {
    const id = this.entryId++;
    const timestamp = new Date();
    const newEntry: Entry = { 
      ...entry, 
      id, 
      createdAt: timestamp, 
      updatedAt: timestamp 
    };
    
    this.entries.set(id, newEntry);
    return newEntry;
  }

  async getEntry(id: number): Promise<Entry | undefined> {
    return this.entries.get(id);
  }

  async getEntriesByProjectId(projectId: number): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.projectId === projectId
    );
  }

  async updateEntry(id: number, entryUpdate: Partial<InsertEntry>): Promise<Entry> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    const updatedEntry = { 
      ...entry, 
      ...entryUpdate, 
      updatedAt: new Date() 
    };
    
    this.entries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteEntry(id: number): Promise<void> {
    this.entries.delete(id);
  }
}

export const storage = new MemStorage();
