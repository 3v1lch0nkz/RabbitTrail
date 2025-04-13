import { useState, useRef, ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFileUpload } from "@/lib/useFileUpload";
import { EntryType } from "@/types";

interface NewEntryModalProps {
  onClose: () => void;
  projectId: number;
}

export default function NewEntryModal({ onClose, projectId }: NewEntryModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("note");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [tags, setTags] = useState("");
  const [urls, setUrls] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const { 
    file: imageFile, 
    preview: imagePreview, 
    setFile: setImageFile, 
    resetFile: resetImageFile 
  } = useFileUpload({ type: "image" });

  const {
    file: audioFile,
    preview: audioPreview,
    setFile: setAudioFile,
    resetFile: resetAudioFile
  } = useFileUpload({ type: "audio" });

  // Initialize map
  useState(() => {
    if (!window.L || !mapRef.current) return;

    // Default center (San Francisco)
    const defaultCenter = [37.7749, -122.4194];
    
    // Create map
    const map = window.L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13
    });

    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Store map instance
    mapInstanceRef.current = map;

    // Add click handler to set location
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = window.L.marker([lat, lng]).addTo(map);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  });

  // Handle image file selection
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // Handle audio file selection
  const handleAudioChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  // Handle getting user's current location
  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLatitude(latitude.toFixed(6));
          setLongitude(longitude.toFixed(6));
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 15);
            
            if (markerRef.current) {
              markerRef.current.setLatLng([latitude, longitude]);
            } else {
              markerRef.current = window.L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
            }
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please check your permissions.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
    }
  };

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async () => {
      if (!title || !latitude || !longitude) {
        throw new Error("Title and location are required");
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("entryType", entryType);
      
      if (tags) {
        formData.append("tags", tags);
      }
      
      if (urls) {
        formData.append("urls", urls);
      }
      
      if (imageFile) {
        formData.append("image", imageFile);
      }
      
      if (audioFile) {
        formData.append("audio", audioFile);
      }

      const response = await fetch(`/api/projects/${projectId}/entries`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry Created",
        description: "Your entry has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "entries"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEntryMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Add New Entry</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          <form id="new-entry-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6">
              <div className="col-span-1">
                <Label htmlFor="entry-title">Title</Label>
                <Input 
                  id="entry-title" 
                  placeholder="Entry title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Label htmlFor="entry-type">Entry Type</Label>
                  <select 
                    id="entry-type" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as EntryType)}
                  >
                    <option value="evidence">Evidence</option>
                    <option value="lead">Lead</option>
                    <option value="interview">Interview</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <Label>Location</Label>
                  <div className="flex items-center">
                    <div className="flex-1 mr-2">
                      <Input
                        id="entry-location"
                        placeholder="Search location or click on map"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        // Geocoding would be implemented here for production
                        toast({
                          title: "Search Not Available",
                          description: "Please click on the map or use your current location.",
                        });
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="ml-2"
                      onClick={handleMyLocation}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    placeholder="Latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    placeholder="Longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="col-span-1 h-48 md:h-64 border border-gray-300 rounded-md overflow-hidden">
                <div ref={mapRef} className="h-full w-full"></div>
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="entry-description">Description</Label>
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 flex items-center space-x-2">
                    <button type="button" className="text-gray-500 hover:text-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-500 ml-auto">Markdown supported</span>
                  </div>
                  <Textarea
                    id="entry-description"
                    rows={5}
                    className="w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Describe this entry..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  <Label>Image</Label>
                  <div className="border-2 border-gray-300 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                    {imagePreview ? (
                      <div className="relative w-full">
                        <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto" />
                        <button 
                          type="button" 
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                          onClick={resetImageFile}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Drag and drop an image, or click to select</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      id="image-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {!imagePreview && (
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        Select Image
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="col-span-1">
                  <Label>Audio</Label>
                  <div className="border-2 border-gray-300 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                    {audioPreview ? (
                      <div className="w-full">
                        <audio controls className="w-full mb-2">
                          <source src={audioPreview} />
                          Your browser does not support the audio element.
                        </audio>
                        <Button 
                          type="button" 
                          variant="destructive"
                          size="sm"
                          onClick={resetAudioFile}
                        >
                          Remove Audio
                        </Button>
                      </div>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <p className="text-sm text-gray-500">Upload an audio file</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      id="audio-upload" 
                      className="hidden" 
                      accept="audio/*"
                      onChange={handleAudioChange}
                    />
                    {!audioPreview && (
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('audio-upload')?.click()}
                      >
                        Upload Audio
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="entry-tags">Tags</Label>
                <Input
                  id="entry-tags"
                  placeholder="Add tags separated by commas"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="entry-urls">URLs</Label>
                <Input
                  id="entry-urls"
                  placeholder="Add URLs separated by commas"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                />
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-entry-form"
            disabled={createEntryMutation.isPending || !title || !latitude || !longitude}
          >
            {createEntryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Entry"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
