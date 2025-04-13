import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertEntrySchema, 
  insertProjectCollaboratorSchema 
} from "@shared/schema";
import { z } from "zod";

// Auth middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        ownerId: userId
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // Check if user has access to this project
      const hasAccess = await storage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // Check if user is the owner
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can modify project details" });
      }
      
      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // Check if user is the owner
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can delete the project" });
      }
      
      await storage.deleteProject(projectId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Entry routes
  app.get("/api/projects/:projectId/entries", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user?.id;
      
      // Check if user has access to this project
      const hasAccess = await storage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const entries = await storage.getEntriesByProject(projectId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  app.post("/api/projects/:projectId/entries", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user?.id;
      
      // Check if user has access to this project
      const hasAccess = await storage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const entryData = insertEntrySchema.parse({
        ...req.body,
        projectId,
        createdById: userId
      });
      
      const entry = await storage.createEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  app.get("/api/entries/:id", isAuthenticated, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      const entry = await storage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project
      const hasAccess = await storage.checkProjectAccess(entry.projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entry" });
    }
  });

  app.patch("/api/entries/:id", isAuthenticated, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      const entry = await storage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project
      const hasAccess = await storage.checkProjectAccess(entry.projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      const updatedEntry = await storage.updateEntry(entryId, req.body);
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.delete("/api/entries/:id", isAuthenticated, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      const entry = await storage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project
      const hasAccess = await storage.checkProjectAccess(entry.projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      await storage.deleteEntry(entryId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  // Collaborator routes
  app.get("/api/projects/:projectId/collaborators", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user?.id;
      
      // Check if user has access to this project
      const hasAccess = await storage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const collaborators = await storage.getProjectCollaborators(projectId);
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaborators" });
    }
  });

  app.post("/api/projects/:projectId/collaborators", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user?.id;
      
      // Check if user is the owner
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can add collaborators" });
      }
      
      // Find user by email
      const collaboratorEmail = req.body.email;
      const collaborator = await storage.getUserByEmail(collaboratorEmail);
      if (!collaborator) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const collaboratorData = insertProjectCollaboratorSchema.parse({
        projectId,
        userId: collaborator.id,
        role: req.body.role || "editor"
      });
      
      const newCollaborator = await storage.addProjectCollaborator(collaboratorData);
      res.status(201).json(newCollaborator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collaborator data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add collaborator" });
    }
  });

  app.delete("/api/projects/:projectId/collaborators/:userId", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const collaboratorId = parseInt(req.params.userId);
      const userId = req.user?.id;
      
      // Check if user is the owner
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can remove collaborators" });
      }
      
      await storage.removeProjectCollaborator(projectId, collaboratorId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove collaborator" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
