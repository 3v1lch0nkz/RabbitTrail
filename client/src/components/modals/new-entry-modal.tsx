import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEntrySchema, Entry } from "@shared/schema";
import { X, Paperclip, Upload, MapPin, Search, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MapComponent from "@/components/map/map-component";
import { useMutation } from "@tanstack/react-query";
import opencage from "opencage-api-client";
import { useToast } from "@/hooks/use-toast";

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  projectId: number;
  userId: number;
  editEntry?: Entry;
}

// Create extended schema with validation
const formSchema = insertEntrySchema
  .omit({ projectId: true, createdById: true })
  .extend({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    // File uploads would be handled differently in production
    imageFile: z.any().optional(),
    audioFile: z.any().optional(),
  });

type FormValues = z.infer<typeof formSchema>;

const NewEntryModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  projectId, 
  userId,
  editEntry 
}: NewEntryModalProps) => {
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      latitude: "",
      longitude: "",
      links: [],
      mediaUrlImage: "",
      mediaUrlAudio: "",
      imageFile: undefined,
      audioFile: undefined,
    },
  });
  
  // Geocoding mutation
  const geocodeMutation = useMutation({
    mutationFn: async (address: string) => {
      // Make a request to our server endpoint that will use the API key
      // This keeps the API key secure on the server side
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to geocode address");
      }
      
      const result = await res.json();
      
      if (!result || !result.results || result.results.length === 0) {
        throw new Error("No results found for this address");
      }
      
      return result.results[0];
    },
    onSuccess: (data) => {
      const { lat, lng } = data.geometry;
      setSelectedLocation([lat, lng]);
      form.setValue("latitude", lat.toString());
      form.setValue("longitude", lng.toString());
      toast({
        title: "Location found",
        description: `Found location: ${data.formatted}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error finding location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set form values when editing an entry
  useEffect(() => {
    if (editEntry) {
      form.reset({
        title: editEntry.title,
        description: editEntry.description || "",
        latitude: editEntry.latitude || "",
        longitude: editEntry.longitude || "",
        links: editEntry.links || [],
        mediaUrlImage: editEntry.mediaUrlImage || "",
        mediaUrlAudio: editEntry.mediaUrlAudio || "",
      });

      if (editEntry.latitude && editEntry.longitude) {
        setSelectedLocation([
          parseFloat(editEntry.latitude),
          parseFloat(editEntry.longitude)
        ]);
      }
    } else {
      form.reset({
        title: "",
        description: "",
        latitude: "",
        longitude: "",
        links: [],
        mediaUrlImage: "",
        mediaUrlAudio: "",
        imageFile: undefined,
        audioFile: undefined,
      });
      setSelectedLocation(null);
    }
  }, [editEntry, form, isOpen]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation([lat, lng]);
    form.setValue("latitude", lat.toString());
    form.setValue("longitude", lng.toString());
  };

  const handleUseMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation([latitude, longitude]);
        form.setValue("latitude", latitude.toString());
        form.setValue("longitude", longitude.toString());
      },
      (error) => {
        console.error("Error getting location:", error);
      }
    );
  };

  const handleSubmit = async (data: FormValues) => {
    try {
      // Handle image file upload if present
      let mediaUrlImage = data.mediaUrlImage;
      if (data.imageFile) {
        const formData = new FormData();
        formData.append('file', data.imageFile);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload image');
        }
        
        const result = await response.json();
        mediaUrlImage = result.filePath;
      }
      
      // Handle audio file upload if present
      let mediaUrlAudio = data.mediaUrlAudio;
      if (data.audioFile) {
        const formData = new FormData();
        formData.append('file', data.audioFile);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload audio');
        }
        
        const result = await response.json();
        mediaUrlAudio = result.filePath;
      }
      
      // Submit the entry with proper file URLs
      const formData = {
        ...data,
        projectId,
        createdById: userId,
        mediaUrlImage,
        mediaUrlAudio,
      };
      
      onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error saving entry",
        description: error instanceof Error ? error.message : "Failed to save entry with uploads",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto z-[100] fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>{editEntry ? "Edit Entry" : "New Entry"}</DialogTitle>
          <DialogDescription>
            Add details about your investigation entry
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Entry title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Markdown supported)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe this entry..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Use markdown formatting. **Bold**, *italic*, [links](url), and more.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Location</FormLabel>
              
              {/* Address search input */}
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Search address or place"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-3 py-2 flex items-center justify-center" 
                  onClick={() => geocodeMutation.mutate(addressSearch)}
                  disabled={!addressSearch || geocodeMutation.isPending}
                  title="Search for address"
                >
                  {geocodeMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="Latitude" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="Longitude" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-3 py-2 flex items-center justify-center" 
                  onClick={handleUseMyLocation}
                  title="Use my location"
                >
                  <MapPin className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Mini map preview */}
              <div className="h-32 bg-gray-100 rounded-md overflow-hidden">
                <MapComponent 
                  entries={[]}
                  onMarkerClick={() => {}}
                  onMapClick={handleLocationSelect}
                  center={selectedLocation || undefined}
                  zoom={selectedLocation ? 15 : 13}
                  className="h-full"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <FormLabel>Media</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="imageFile"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center">
                          <label 
                            htmlFor="image-upload" 
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="w-8 h-8 text-gray-400" />
                            <p className="mt-1 text-sm text-gray-500">Upload image</p>
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  onChange(file);
                                }
                              }}
                              {...fieldProps}
                            />
                          </label>
                          {(value || form.watch("mediaUrlImage")) && (
                            <div className="mt-2 text-xs text-green-600">
                              {value?.name || "Image uploaded"}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="audioFile"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center">
                          <label 
                            htmlFor="audio-upload" 
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Paperclip className="w-8 h-8 text-gray-400" />
                            <p className="mt-1 text-sm text-gray-500">Upload audio</p>
                            <input
                              id="audio-upload"
                              type="file"
                              className="hidden"
                              accept="audio/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  onChange(file);
                                }
                              }}
                              {...fieldProps}
                            />
                          </label>
                          {(value || form.watch("mediaUrlAudio")) && (
                            <div className="mt-2 text-xs text-green-600">
                              {value?.name || "Audio uploaded"}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="links"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Links (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="https://example.com" 
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? [value] : []);
                      }}
                      value={field.value && field.value.length > 0 ? field.value[0] : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">
                {editEntry ? "Save Changes" : "Create Entry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewEntryModal;
