export type EntryType = "evidence" | "lead" | "interview" | "note";

export type CollaboratorRole = "owner" | "collaborator" | "viewer";

export interface MapLocation {
  latitude: number;
  longitude: number;
}

export interface FileUpload {
  file: File;
  preview: string;
}
