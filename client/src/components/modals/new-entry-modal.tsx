import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEntrySchema, Entry } from "@shared/schema";
import { X, Paperclip, Upload, MapPin, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import opencage from "opencage-api-client";

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
    // File uploads are handled differently
    mediaFile: z.any().optional(),
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
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{
    description: string;
    place_id: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
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
      mediaFile: undefined,
    },
  });
  
  // Address suggestion mutation
  const suggestAddressMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim() || query.length < 3) return [];
      
      // Make a request to get address suggestions from the server
      const res = await fetch(`/api/address-suggest?query=${encodeURIComponent(query)}`);
      
      if (!res.ok) {
        throw new Error("Failed to get address suggestions");
      }
      
      const suggestions = await res.json();
      return suggestions.results || [];
    },
    onSuccess: (data) => {
      setSearchSuggestions(data);
      setShowSuggestions(data.length > 0);
    },
    onError: () => {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
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
      setShowSuggestions(false);
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
  
  // Use our debounce hook for address searching
  const debouncedAddressSearch = useDebounce(addressSearch, 300);
  
  // Handle address input change with debounce
  useEffect(() => {
    if (debouncedAddressSearch.trim().length >= 3) {
      suggestAddressMutation.mutate(debouncedAddressSearch);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedAddressSearch]);

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
        mediaFile: undefined,
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
        mediaFile: undefined,
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
    toast({
      title: "Accessing GPS...",
      description: "Getting your current location",
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation([latitude, longitude]);
        form.setValue("latitude", latitude.toString());
        form.setValue("longitude", longitude.toString());
        
        // Reverse geocode to get address for better context
        geocodeMutation.mutate(`${latitude},${longitude}`);
        
        toast({
          title: "Location found",
          description: "Successfully retrieved your GPS coordinates",
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        
        let errorMessage = "Failed to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Try again later.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Try again.";
            break;
        }
        
        toast({
          title: "GPS Error",
          description: errorMessage,
          variant: "destructive"
        });
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (data: FormValues) => {
    try {
      // Handle media file upload if present
      let mediaUrlImage = data.mediaUrlImage;
      let mediaUrlAudio = data.mediaUrlAudio;
      
      if (data.mediaFile) {
        const file = data.mediaFile;
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const MAX_SIZE = 100 * 1024 * 1024; // 100MB
        
        // Validate file size
        if (file.size > MAX_SIZE) {
          toast({
            title: "File too large",
            description: `File size is ${fileSizeMB}MB. Maximum allowed is 100MB.`,
            variant: "destructive"
          });
          return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.type.split('/')[0]}`);
        }
        
        const result = await response.json();
        
        // Determine file type from MIME type and store in appropriate field
        if (file.type.startsWith('image/')) {
          mediaUrlImage = result.filePath;
        } else {
          // Audio, video, or text file
          mediaUrlAudio = result.filePath;
        }
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
              <div className="relative">
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Search address or place"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    className="flex-1"
                    onFocus={() => showSuggestions && setShowSuggestions(true)}
                    onBlur={() => {
                      // Small delay to allow clicking on suggestions
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
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
                
                {/* Address suggestions dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <ul className="py-1">
                      {searchSuggestions.map((suggestion, index) => (
                        <li 
                          key={suggestion.place_id || index}
                          className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setAddressSearch(suggestion.description);
                            geocodeMutation.mutate(suggestion.description);
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                  variant="secondary" 
                  className="px-3 py-2 flex items-center justify-center gap-1" 
                  onClick={handleUseMyLocation}
                  title="Use GPS location from your device"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">Use GPS</span>
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
              <FormLabel>Media (Max 100MB per entry)</FormLabel>
              <FormField
                control={form.control}
                name="mediaFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormControl>
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center">
                        <label 
                          htmlFor="media-upload" 
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="mt-1 text-sm text-gray-500">Upload media</p>
                          <p className="text-xs text-gray-400 text-center">
                            Images: JPG, PNG, GIF, WebP, SVG
                          </p>
                          <p className="text-xs text-gray-400 text-center">
                            Other: Audio, Video, Text files
                          </p>
                          <input
                            id="media-upload"
                            type="file"
                            className="hidden"
                            accept="image/*,audio/*,video/*,text/plain"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Show file size 
                                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                                if (file.size > 100 * 1024 * 1024) {
                                  toast({
                                    title: "File too large",
                                    description: `File size is ${fileSizeMB}MB. Maximum allowed is 100MB.`,
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                onChange(file);
                              }
                            }}
                            {...fieldProps}
                          />
                        </label>
                        {value && (
                          <div className="mt-2 text-xs text-green-600">
                            {value.name} ({(value.size / (1024 * 1024)).toFixed(2)}MB)
                            <p className="text-xs text-gray-500">
                              {value.type.startsWith('image/') ? 'Image' : 
                               value.type.startsWith('audio/') ? 'Audio' : 
                               value.type.startsWith('video/') ? 'Video' : 'Text'} file
                            </p>
                          </div>
                        )}
                        {(!value && (form.watch("mediaUrlImage") || form.watch("mediaUrlAudio"))) && (
                          <div className="mt-2 text-xs text-green-600">
                            Media already uploaded
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-gray-500 mt-1">Maximum file size is 100MB.</p>
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
