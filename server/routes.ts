import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import { insertAudioFileSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve public audio files
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve uploaded audio files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      return res.status(404).json({ error: "File not found" });
    }
  });

  // Get upload URL for audio files
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save audio file metadata after upload
  app.post("/api/audio-files", async (req, res) => {
    try {
      const audioFileData = insertAudioFileSchema.parse({
        name: req.body.name,
        filename: req.body.filename,
        fileSize: req.body.fileSize,
        mimeType: req.body.mimeType,
        objectPath: req.body.audioFileURL, // Will be normalized in storage
      });

      const audioFile = await storage.createAudioFile(audioFileData);
      res.status(201).json(audioFile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid audio file data", details: error.errors });
      }
      console.error("Error saving audio file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all audio files
  app.get("/api/audio-files", async (req, res) => {
    try {
      const audioFiles = await storage.getAudioFiles();
      res.json(audioFiles);
    } catch (error) {
      console.error("Error getting audio files:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get specific audio file
  app.get("/api/audio-files/:id", async (req, res) => {
    try {
      const audioFile = await storage.getAudioFile(req.params.id);
      if (!audioFile) {
        return res.status(404).json({ error: "Audio file not found" });
      }
      res.json(audioFile);
    } catch (error) {
      console.error("Error getting audio file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
