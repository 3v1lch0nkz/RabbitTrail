import { useState, useEffect } from "react";

interface UseFileUploadOptions {
  type: "image" | "audio";
}

export function useFileUpload({ type }: UseFileUploadOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
  };

  return {
    file,
    setFile,
    preview,
    resetFile,
  };
}
