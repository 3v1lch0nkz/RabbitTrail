import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProjectSchema, insertEntrySchema, insertProjectCollaboratorSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer for file uploads
const storage_engine = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_engine,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      // Accept only images
      const filetypes = /jpeg|jpg|png|gif|webp/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only image files are allowed'));
    } else if (file.fieldname === 'audio') {
      // Accept only audio files
      const filetypes = /mp3|wav|ogg|m4a/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only audio files are allowed'));
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: () => void) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Project permission middleware
async function hasProjectAccess(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  const project = await storage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const userId = req.user!.id;
  
  // Check if user is owner or collaborator
  const role = await storage.getCollaboratorRole(projectId, userId);
  if (!role) {
    return res.status(403).json({ message: "You don't have access to this project" });
  }

  // Add role to request for use in route handlers
  (req as any).userRole = role;
  next();
}

// Project owner permission middleware
async function isProjectOwner(req: Request, res: Response, next: () => void) {
  if ((req as any).userRole !== 'owner') {
    return res.status(403).json({ message: "Only the project owner can perform this action" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Project routes
  app.post("/api/projects", isAuthenticated, async (req, res, next) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        ownerId: req.user!.id
      });

      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      next(error);
    }
  });

  app.get("/api/projects", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const ownedProjects = await storage.getProjectsByUserId(userId);
    const sharedProjects = await storage.getSharedProjectsByUserId(userId);
    
    res.json({
      owned: ownedProjects,
      shared: sharedProjects
    });
  });

  app.get("/api/projects/:projectId", isAuthenticated, hasProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const project = await storage.getProject(projectId);
    res.json(project);
  });

  app.put("/api/projects/:projectId", isAuthenticated, hasProjectAccess, isProjectOwner, async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const projectData = insertProjectSchema.partial().parse(req.body);
      
      const updatedProject = await storage.updateProject(projectId, projectData);
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      next(error);
    }
  });

  app.delete("/api/projects/:projectId", isAuthenticated, hasProjectAccess, isProjectOwner, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    await storage.deleteProject(projectId);
    res.status(204).send();
  });

  // Project collaborator routes
  app.post("/api/projects/:projectId/collaborators", isAuthenticated, hasProjectAccess, isProjectOwner, async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // First, check if the user exists
      const userEmail = req.body.email;
      const userToAdd = await storage.getUserByEmail(userEmail);
      
      if (!userToAdd) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is already a collaborator
      const collaborators = await storage.getCollaborators(projectId);
      const isAlreadyCollaborator = collaborators.some(c => c.userId === userToAdd.id);
      
      if (isAlreadyCollaborator) {
        return res.status(400).json({ message: "User is already a collaborator" });
      }

      // Add as collaborator
      const collaboratorData = insertProjectCollaboratorSchema.parse({
        projectId,
        userId: userToAdd.id,
        role: req.body.role || "collaborator"
      });

      const collaborator = await storage.addCollaborator(collaboratorData);
      
      // Return collaborator with user details
      const user = await storage.getUser(collaborator.userId);
      res.status(201).json({
        ...collaborator,
        user: {
          id: user!.id,
          username: user!.username,
          email: user!.email,
          displayName: user!.displayName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      next(error);
    }
  });

  app.get("/api/projects/:projectId/collaborators", isAuthenticated, hasProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const collaborators = await storage.getCollaborators(projectId);
    
    // Get user details for each collaborator
    const collaboratorsWithUserDetails = await Promise.all(
      collaborators.map(async (collaborator) => {
        const user = await storage.getUser(collaborator.userId);
        return {
          ...collaborator,
          user: {
            id: user!.id,
            username: user!.username,
            email: user!.email,
            displayName: user!.displayName
          }
        };
      })
    );
    
    res.json(collaboratorsWithUserDetails);
  });

  app.put("/api/projects/:projectId/collaborators/:userId", isAuthenticated, hasProjectAccess, isProjectOwner, async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      
      if (!role || !['collaborator', 'viewer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Don't allow changing the owner's role
      const collaborators = await storage.getCollaborators(projectId);
      const isTargetOwner = collaborators.some(c => c.userId === userId && c.role === 'owner');
      
      if (isTargetOwner) {
        return res.status(400).json({ message: "Cannot change the owner's role" });
      }

      const updatedCollaborator = await storage.updateCollaboratorRole(projectId, userId, role);
      
      // Get user details
      const user = await storage.getUser(userId);
      res.json({
        ...updatedCollaborator,
        user: {
          id: user!.id,
          username: user!.username,
          email: user!.email,
          displayName: user!.displayName
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/projects/:projectId/collaborators/:userId", isAuthenticated, hasProjectAccess, isProjectOwner, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const userId = parseInt(req.params.userId);
    
    // Don't allow removing the owner
    const collaborators = await storage.getCollaborators(projectId);
    const isTargetOwner = collaborators.some(c => c.userId === userId && c.role === 'owner');
    
    if (isTargetOwner) {
      return res.status(400).json({ message: "Cannot remove the project owner" });
    }

    await storage.removeCollaborator(projectId, userId);
    res.status(204).send();
  });

  // Entry routes
  app.post("/api/projects/:projectId/entries", isAuthenticated, hasProjectAccess, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]), async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      let mediaUrlImage;
      let mediaUrlAudio;
      
      if (files && files.image && files.image[0]) {
        mediaUrlImage = `/uploads/${files.image[0].filename}`;
      }
      
      if (files && files.audio && files.audio[0]) {
        mediaUrlAudio = `/uploads/${files.audio[0].filename}`;
      }
      
      // Convert tags string to array if provided
      let tags;
      if (req.body.tags) {
        tags = req.body.tags.split(',').map((tag: string) => tag.trim());
      }
      
      // Convert urls string to array if provided
      let urls;
      if (req.body.urls) {
        urls = req.body.urls.split(',').map((url: string) => url.trim());
      }
      
      const entryData = insertEntrySchema.parse({
        projectId,
        createdById: req.user!.id,
        title: req.body.title,
        description: req.body.description,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        entryType: req.body.entryType || 'note',
        mediaUrlImage,
        mediaUrlAudio,
        tags,
        urls
      });

      const entry = await storage.createEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      next(error);
    }
  });

  app.get("/api/projects/:projectId/entries", isAuthenticated, hasProjectAccess, async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const entries = await storage.getEntriesByProjectId(projectId);
    
    // Get creator details for each entry
    const entriesWithCreatorDetails = await Promise.all(
      entries.map(async (entry) => {
        const creator = await storage.getUser(entry.createdById);
        return {
          ...entry,
          creator: {
            id: creator!.id,
            displayName: creator!.displayName
          }
        };
      })
    );
    
    res.json(entriesWithCreatorDetails);
  });

  app.get("/api/entries/:entryId", isAuthenticated, async (req, res, next) => {
    try {
      const entryId = parseInt(req.params.entryId);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      
      const entry = await storage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project this entry belongs to
      const role = await storage.getCollaboratorRole(entry.projectId, req.user!.id);
      if (!role) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      // Get creator details
      const creator = await storage.getUser(entry.createdById);
      
      res.json({
        ...entry,
        creator: {
          id: creator!.id,
          displayName: creator!.displayName
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/entries/:entryId", isAuthenticated, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]), async (req, res, next) => {
    try {
      const entryId = parseInt(req.params.entryId);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      
      const entry = await storage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project this entry belongs to
      const role = await storage.getCollaboratorRole(entry.projectId, req.user!.id);
      if (!role) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      // Check if user is the creator or has owner role
      if (entry.createdById !== req.user!.id && role !== 'owner') {
        return res.status(403).json({ message: "You don't have permission to edit this entry" });
      }
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      let mediaUrlImage = entry.mediaUrlImage;
      let mediaUrlAudio = entry.mediaUrlAudio;
      
      if (files && files.image && files.image[0]) {
        mediaUrlImage = `/uploads/${files.image[0].filename}`;
      }
      
      if (files && files.audio && files.audio[0]) {
        mediaUrlAudio = `/uploads/${files.audio[0].filename}`;
      }
      
      // Convert tags string to array if provided
      let tags = entry.tags;
      if (req.body.tags) {
        tags = req.body.tags.split(',').map((tag: string) => tag.trim());
      }
      
      // Convert urls string to array if provided
      let urls = entry.urls;
      if (req.body.urls) {
        urls = req.body.urls.split(',').map((url: string) => url.trim());
      }
      
      const entryData = insertEntrySchema.partial().parse({
        title: req.body.title,
        description: req.body.description,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        entryType: req.body.entryType,
        mediaUrlImage,
        mediaUrlAudio,
        tags,
        urls
      });

      const updatedEntry = await storage.updateEntry(entryId, entryData);
      
      // Get creator details
      const creator = await storage.getUser(updatedEntry.createdById);
      
      res.json({
        ...updatedEntry,
        creator: {
          id: creator!.id,
          displayName: creator!.displayName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      next(error);
    }
  });

  app.delete("/api/entries/:entryId", isAuthenticated, async (req, res, next) => {
    try {
      const entryId = parseInt(req.params.entryId);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      
      const entry = await storage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project this entry belongs to
      const role = await storage.getCollaboratorRole(entry.projectId, req.user!.id);
      if (!role) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      // Check if user is the creator or has owner role
      if (entry.createdById !== req.user!.id && role !== 'owner') {
        return res.status(403).json({ message: "You don't have permission to delete this entry" });
      }
      
      await storage.deleteEntry(entryId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }, express.static(uploadsDir));

  const httpServer = createServer(app);
  return httpServer;
}
