import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseFileUploadOptions {
  type: "image" | "audio" | "video" | "text";
}

interface UploadResult {
  success: boolean;
  filePath: string;
  originalName: string;
  mimetype: string;
}

export function useFileUpload({ type }: UseFileUploadOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const { toast } = useToast();

  // Max file size: 100MB
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

  // File validator function
  const validateFile = (file: File): { valid: boolean; message?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        message: `File is too large. Maximum size is 100MB (current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`
      };
    }

    // Check file type
    const validTypes = {
      'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
      'video': ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
      'text': ['text/plain']
    };

    if (type && !validTypes[type].some(validType => file.type.startsWith(validType.split('/')[0]))) {
      return {
        valid: false,
        message: `Invalid file type. Please upload a ${type} file.`
      };
    }

    return { valid: true };
  };

  // Override setFile to validate files
  const setFileWithValidation = (file: File | null) => {
    if (!file) {
      setFile(null);
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    setFile(file);
  };

  // Create a preview URL when the file changes
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    // For images, create a preview
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    
    // For audio, video, or text files, just set a type indicator
    setPreview(file.type);
    return undefined;
  }, [file]);

  // Reset file state
  const resetFile = () => {
    setFile(null);
    setPreview(null);
    setUploadedFilePath(null);
  };

  // Upload file to server
  const uploadFile = async (): Promise<string | null> => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return null;
    }

    // Validate file again before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.message,
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to upload file');
      }
      
      const result: UploadResult = await response.json();
      
      if (!result.success) {
        throw new Error('Upload failed');
      }
      
      setUploadedFilePath(result.filePath);
      toast({
        title: "Upload successful",
        description: `File "${file.name}" uploaded successfully (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
      });
      return result.filePath;
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    file,
    setFile: setFileWithValidation,
    preview,
    resetFile,
    uploadFile,
    isUploading,
    uploadedFilePath,
    MAX_FILE_SIZE,
    validateFile
  };
}
