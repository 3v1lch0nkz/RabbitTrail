import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage as dataStorage } from "./storage";
import { 
  insertProjectSchema, 
  insertEntrySchema, 
  insertProjectCollaboratorSchema 
} from "@shared/schema";
import { z } from "zod";
import opencage from "opencage-api-client";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import express from "express";

// Auth middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Set up multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage for uploaded files
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function(req, file, cb) {
    // Accept images, audio, video, and text files
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'text/plain'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image, audio, video, and text files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve robots.txt file
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /auth
Disallow: /projects
Disallow: /account
Disallow: /team
Disallow: /api/

# Allow only the landing page, disallow all other routes`);
  });
  
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);
  
  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // File upload endpoint
  app.post('/api/upload', isAuthenticated, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Return the file path that can be used to access the file
      const filePath = `/uploads/${req.file.filename}`;
      res.json({ 
        success: true, 
        filePath, 
        originalName: req.file.originalname,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const projects = await dataStorage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const projectData = insertProjectSchema.parse({
        ...req.body,
        ownerId: userId
      });
      
      const project = await dataStorage.createProject(projectData);
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
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user has access to this project
      const hasAccess = await dataStorage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const project = await dataStorage.getProject(projectId);
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
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user is the owner
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can modify project details" });
      }
      
      const updatedProject = await dataStorage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Export project data
app.get("/api/projects/:id/export", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user has access to this project
      const hasAccess = await dataStorage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      // Get all project data
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const entries = await dataStorage.getEntriesByProject(projectId);
      const collaborators = await dataStorage.getProjectCollaborators(projectId);
      
      // Create export object
      const exportData = {
        project,
        entries,
        collaborators,
        exportedAt: new Date().toISOString(),
        exportedBy: userId
      };
      
      res.json(exportData);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export project data" });
    }
  });
  
  // Archive a project
  app.patch("/api/projects/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user is the owner
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can archive the project" });
      }
      
      const archivedProject = await dataStorage.updateProject(projectId, { 
        archived: true,
        archivedAt: new Date() 
      });
      
      res.json(archivedProject);
    } catch (error) {
      console.error("Archive error:", error);
      res.status(500).json({ message: "Failed to archive project" });
    }
  });
  
  // Unarchive a project
  app.patch("/api/projects/:id/unarchive", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user is the owner
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can unarchive the project" });
      }
      
      const unarchivedProject = await dataStorage.updateProject(projectId, { 
        archived: false,
        archivedAt: null 
      });
      
      res.json(unarchivedProject);
    } catch (error) {
      console.error("Unarchive error:", error);
      res.status(500).json({ message: "Failed to unarchive project" });
    }
  });
  
  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user is the owner
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can delete the project" });
      }
      
      await dataStorage.deleteProject(projectId);
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
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user has access to this project
      const hasAccess = await dataStorage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const entries = await dataStorage.getEntriesByProject(projectId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  app.post("/api/projects/:projectId/entries", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user?.id;
      
      // Check if user is authenticated
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user has access to this project
      const hasAccess = await dataStorage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const entryData = insertEntrySchema.parse({
        ...req.body,
        projectId,
        createdById: userId
      });
      
      const entry = await dataStorage.createEntry(entryData);
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
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const entry = await dataStorage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project
      const hasAccess = await dataStorage.checkProjectAccess(entry.projectId, userId);
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
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const entry = await dataStorage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project
      const hasAccess = await dataStorage.checkProjectAccess(entry.projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      const updatedEntry = await dataStorage.updateEntry(entryId, req.body);
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.delete("/api/entries/:id", isAuthenticated, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const entry = await dataStorage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Check if user has access to the project
      const hasAccess = await dataStorage.checkProjectAccess(entry.projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this entry" });
      }
      
      await dataStorage.deleteEntry(entryId);
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
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user has access to this project
      const hasAccess = await dataStorage.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
      
      const collaborators = await dataStorage.getProjectCollaborators(projectId);
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
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can add collaborators" });
      }
      
      // Find user by email
      const collaboratorEmail = req.body.email;
      const collaborator = await dataStorage.getUserByEmail(collaboratorEmail);
      
      // If user exists, add them directly as a collaborator
      if (collaborator) {
        const collaboratorData = insertProjectCollaboratorSchema.parse({
          projectId,
          userId: collaborator.id,
          role: req.body.role || "editor"
        });
        
        const newCollaborator = await dataStorage.addProjectCollaborator(collaboratorData);
        return res.status(201).json({ 
          success: true, 
          collaborator: newCollaborator, 
          message: "Collaborator added successfully"
        });
      } 
      
      // User doesn't exist, create an invitation
      // Check if an invitation already exists for this email
      const existingInvitation = await dataStorage.getInvitationByEmail(projectId, collaboratorEmail);
      if (existingInvitation && existingInvitation.status === "pending") {
        return res.status(200).json({ 
          success: true, 
          invitation: existingInvitation,
          message: "Invitation already sent to this email"
        });
      }
      
      // Create a new invitation
      const invitation = await dataStorage.createProjectInvitation({
        projectId,
        email: collaboratorEmail,
        role: req.body.role || "editor",
        invitedBy: userId
      });
      
      // In a real application, this is where you would send an email with the invitation link
      // using the SendGrid API

      return res.status(201).json({ 
        success: true, 
        invitation,
        message: "Invitation sent successfully",
        inviteLink: `${req.protocol}://${req.get('host')}/invite/${invitation.token}`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collaborator data", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Failed to add collaborator" });
    }
  });

  app.delete("/api/projects/:projectId/collaborators/:userId", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const collaboratorId = parseInt(req.params.userId);
      const userId = req.user?.id;
      
      // Check if user is the owner
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can remove collaborators" });
      }
      
      await dataStorage.removeProjectCollaborator(projectId, collaboratorId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove collaborator" });
    }
  });

  // Invitation management endpoints
  app.get("/api/projects/:projectId/invitations", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user?.id;
      
      // Check if user is the owner
      const project = await dataStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only the owner can view invitations" });
      }
      
      const invitations = await dataStorage.getProjectInvitations(projectId);
      res.json(invitations);
    } catch (error) {
      console.error("Error getting invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });
  
  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const invitation = await dataStorage.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Check if invitation is expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ message: "Invitation has expired" });
      }
      
      // Check if invitation has already been accepted
      if (invitation.status !== "pending") {
        return res.status(410).json({ message: "Invitation has already been used" });
      }
      
      // Get project details to include in response
      const project = await dataStorage.getProject(invitation.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({
        invitation,
        project: {
          id: project.id,
          title: project.title,
          description: project.description
        }
      });
    } catch (error) {
      console.error("Error getting invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });
  
  app.post("/api/invitations/:token/accept", isAuthenticated, async (req, res) => {
    try {
      const token = req.params.token;
      const userId = req.user?.id;
      
      const invitation = await dataStorage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Check if invitation is expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ message: "Invitation has expired" });
      }
      
      // Check if invitation has already been accepted
      if (invitation.status !== "pending") {
        return res.status(410).json({ message: "Invitation has already been used" });
      }
      
      // Verify the user's email matches the invitation email
      const user = await dataStorage.getUser(userId);
      if (!user || user.email !== invitation.email) {
        return res.status(403).json({ 
          message: "You cannot accept an invitation sent to a different email address" 
        });
      }
      
      // Add user as collaborator
      const collaboratorData = insertProjectCollaboratorSchema.parse({
        projectId: invitation.projectId,
        userId,
        role: invitation.role
      });
      
      const newCollaborator = await dataStorage.addProjectCollaborator(collaboratorData);
      
      // Update invitation status
      await dataStorage.updateInvitationStatus(invitation.id, "accepted");
      
      res.status(200).json({ 
        success: true, 
        collaborator: newCollaborator,
        message: "Invitation accepted successfully" 
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });
  
  // Endpoint to handle registration from invitation
  app.get("/invite/:token", async (req, res) => {
    const token = req.params.token;
    
    // Redirect to auth page with invitation token as query parameter
    res.redirect(`/auth?invitation=${token}`);
  });
  
  // Geocoding endpoint
  app.get("/api/geocode", async (req, res) => {
    try {
      const address = req.query.address as string;
      
      if (!address) {
        return res.status(400).json({ message: "Address query parameter is required" });
      }
      
      if (!process.env.OPENCAGE_API_KEY) {
        return res.status(500).json({ message: "Geocoding API key is not configured" });
      }
      
      const result = await opencage.geocode({
        q: address,
        key: process.env.OPENCAGE_API_KEY,
      });
      
      if (result.status.code !== 200) {
        return res.status(result.status.code).json({ 
          message: `Geocoding error: ${result.status.message}` 
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });
  
  // Address suggestion endpoint for type-ahead search
  app.get("/api/address-suggest", async (req, res) => {
    try {
      const query = req.query.query as string;
      
      if (!query || query.length < 3) {
        return res.status(400).json({ 
          message: "Query parameter is required and must be at least 3 characters" 
        });
      }
      
      if (!process.env.OPENCAGE_API_KEY) {
        return res.status(500).json({ message: "Geocoding API key is not configured" });
      }
      
      // Use OpenCage API for address suggestions
      const result = await opencage.geocode({
        q: query,
        key: process.env.OPENCAGE_API_KEY,
        limit: 5, // Limit to 5 suggestions
        no_annotations: 1 // Reduce response size
      });
      
      if (result.status.code !== 200) {
        return res.status(result.status.code).json({ 
          message: `Address suggestion error: ${result.status.message}` 
        });
      }
      
      // Transform results into a more suitable format for suggestions
      const suggestions = result.results.map((item: any) => ({
        description: item.formatted,
        place_id: item.annotations?.geohash || String(Math.random())
      }));
      
      res.json({ results: suggestions });
    } catch (error) {
      console.error("Address suggestion error:", error);
      res.status(500).json({ message: "Failed to get address suggestions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
