import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseFileUploadOptions {
  type: "image" | "audio";
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

  // Create a preview URL when the file changes
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    // Create an object URL for the file
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Clean up when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
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
    setFile,
    preview,
    resetFile,
    uploadFile,
    isUploading,
    uploadedFilePath,
  };
}
