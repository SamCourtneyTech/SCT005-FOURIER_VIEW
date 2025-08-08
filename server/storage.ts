import { type User, type InsertUser, type AudioFile, type InsertAudioFile } from "@shared/schema";
import { randomUUID } from "crypto";
import { ObjectStorageService } from "./objectStorage";

// Modify the interface with any CRUD methods you might need
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAudioFile(id: string): Promise<AudioFile | undefined>;
  getAudioFiles(): Promise<AudioFile[]>;
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private audioFiles: Map<string, AudioFile>;

  constructor() {
    this.users = new Map();
    this.audioFiles = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAudioFile(id: string): Promise<AudioFile | undefined> {
    return this.audioFiles.get(id);
  }

  async getAudioFiles(): Promise<AudioFile[]> {
    return Array.from(this.audioFiles.values());
  }

  async createAudioFile(insertAudioFile: InsertAudioFile): Promise<AudioFile> {
    const id = randomUUID();
    
    // Normalize the object path if it's a full URL
    const objectStorageService = new ObjectStorageService();
    const normalizedPath = objectStorageService.normalizeObjectEntityPath(insertAudioFile.objectPath);
    
    const audioFile: AudioFile = {
      ...insertAudioFile,
      id,
      objectPath: normalizedPath,
      fileSize: insertAudioFile.fileSize || null,
      mimeType: insertAudioFile.mimeType || null,
      uploadedAt: new Date(),
    };
    
    this.audioFiles.set(id, audioFile);
    return audioFile;
  }
}

export const storage = new MemStorage();
