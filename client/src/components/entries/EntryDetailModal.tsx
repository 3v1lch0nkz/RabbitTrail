import { useEffect, useRef, useState } from "react";
import { Entry } from "@shared/schema";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EntryDetailModalProps {
  entry: Entry;
  onClose: () => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function EntryDetailModal({ entry, onClose }: EntryDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const miniMapRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Initialize mini map
  useEffect(() => {
    if (!window.L || !miniMapRef.current) return;
    
    const lat = parseFloat(entry.latitude);
    const lng = parseFloat(entry.longitude);
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    const miniMap = window.L.map(miniMapRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false
    }).setView([lat, lng], 15);
    
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(miniMap);
    
    // Custom icon function
    function createCustomIcon(entryType: string) {
      const markerColor = entryType === 'evidence' ? '#047857' : 
                         entryType === 'lead' ? '#C2410C' : 
                         entryType === 'interview' ? '#4F46E5' : '#6B7280';
      
      const markerHtmlStyles = `
        background-color: ${markerColor};
        width: 2rem;
        height: 2rem;
        display: block;
        left: -1rem;
        top: -1rem;
        position: relative;
        border-radius: 2rem 2rem 0;
        transform: rotate(45deg);
        border: 1px solid #FFFFFF
      `;
      
      return window.L.divIcon({
        className: "custom-pin",
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}" />`
      });
    }
    
    window.L.marker([lat, lng], { 
      icon: createCustomIcon(entry.entryType) 
    }).addTo(miniMap);
    
    return () => {
      miniMap.remove();
    };
  }, [entry]);
  
  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/entries/${entry.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Entry deleted",
        description: "The entry has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", entry.projectId, "entries"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Format dates
  const formattedCreatedDate = entry.createdAt
    ? format(new Date(entry.createdAt), "MMM d, yyyy")
    : "";
  
  const formattedUpdatedDate = entry.updatedAt
    ? format(new Date(entry.updatedAt), "MMM d, yyyy")
    : "";
  
  // Function to get the entry type badge
  function EntryTypeBadge({ type }: { type: string }) {
    switch (type) {
      case "evidence":
        return <span className="text-sm bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Evidence</span>;
      case "lead":
        return <span className="text-sm bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Lead</span>;
      case "interview":
        return <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Interview</span>;
      default:
        return <span className="text-sm bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">Note</span>;
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Entry Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col md:flex-row md:space-x-4">
            <div className="md:w-2/3">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-gray-900">{entry.title}</h3>
                <EntryTypeBadge type={entry.entryType} />
              </div>
              
              {entry.description && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="prose prose-sm max-w-none">
                    {entry.description.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {entry.mediaUrlAudio && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Audio Recording</h4>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <audio 
                      controls 
                      className="w-full"
                      src={entry.mediaUrlAudio.startsWith('http') ? entry.mediaUrlAudio : entry.mediaUrlAudio}
                      onError={(e) => {
                        const target = e.target as HTMLAudioElement;
                        // If the audio fails to load directly, check if it might be a relative path
                        if (!target.src.startsWith('http') && !target.src.startsWith('/')) {
                          target.src = `/${target.src}`;
                        }
                      }}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              )}
              
              {entry.mediaUrlImage && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Image</h4>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <img 
                      src={entry.mediaUrlImage.startsWith('http') ? entry.mediaUrlImage : entry.mediaUrlImage} 
                      alt={entry.title} 
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // If the image fails to load directly, check if it might be a relative path
                        if (!target.src.startsWith('http') && !target.src.startsWith('/')) {
                          target.src = `/${target.src}`;
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Location</h4>
                  <span className="text-xs text-gray-500">
                    Lat: {entry.latitude}, Long: {entry.longitude}
                  </span>
                </div>
                <div className="h-40 bg-gray-200 rounded-lg">
                  <div id="mini-map" ref={miniMapRef} className="h-full w-full rounded-lg"></div>
                </div>
              </div>
              
              {entry.urls && entry.urls.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">URLs</h4>
                  <div className="space-y-1">
                    {entry.urls.map((url, index) => (
                      <a 
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline block text-sm truncate"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="md:w-1/3 space-y-4 mt-4 md:mt-0">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Added by</h4>
                <div className="flex items-center">
                  <span className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-primary mr-2">
                    {entry.creator?.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm">{entry.creator?.displayName}</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Dates</h4>
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formattedCreatedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last updated:</span>
                    <span>{formattedUpdatedDate}</span>
                  </div>
                </div>
              </div>
              
              {entry.tags && entry.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-between">
          {confirmDelete ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteEntryMutation.mutate()}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                disabled={deleteEntryMutation.isPending}
              >
                {deleteEntryMutation.isPending ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </div>
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Entry
          </button>
        </div>
      </div>
    </div>
  );
}
