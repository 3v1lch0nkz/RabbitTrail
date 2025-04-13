import { 
  User, InsertUser, 
  Project, InsertProject, 
  Entry, InsertEntry,
  ProjectCollaborator, InsertProjectCollaborator
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

export const storage = new MemStorage();
