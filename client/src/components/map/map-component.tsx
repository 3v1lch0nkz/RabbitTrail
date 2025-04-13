import { useEffect, useRef, useState } from "react";
import { Entry } from "@shared/schema";
import { MapPin, Plus, Minus, Navigation } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MapComponentProps {
  entries: Entry[];
  onMarkerClick: (entry: Entry) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

const MapComponent = ({
  entries,
  onMarkerClick,
  onMapClick,
  className = "",
  center = [40.712, -74.006],
  zoom = 13,
  interactive = true,
}: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaflet = async () => {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!window.L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      setIsLoading(false);
    };

    loadLeaflet();
  }, []);

  useEffect(() => {
    if (isLoading || !mapRef.current) return;

    if (!leafletMapRef.current) {
      leafletMapRef.current = window.L.map(mapRef.current).setView(center, zoom);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(leafletMapRef.current);

      if (interactive && onMapClick) {
        leafletMapRef.current.on('click', (e: any) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }
    } else {
      leafletMapRef.current.setView(center, zoom);
    }

    // Clean up previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each entry
    entries.forEach(entry => {
      if (entry.latitude && entry.longitude) {
        const lat = parseFloat(entry.latitude);
        const lng = parseFloat(entry.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = window.L.marker([lat, lng]).addTo(leafletMapRef.current);
          marker.bindPopup(`<b>${entry.title}</b>`);
          marker.on('click', () => onMarkerClick(entry));
          markersRef.current.push(marker);
        }
      }
    });

    return () => {
      // No cleanup needed for map itself as it will be reused
    };
  }, [isLoading, entries, center, zoom, interactive, onMapClick, onMarkerClick]);

  const handleZoomIn = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setZoom(leafletMapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setZoom(leafletMapRef.current.getZoom() - 1);
    }
  };

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([latitude, longitude], 15);
        }
      }, (error) => {
        console.error("Error getting location:", error);
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : null}
      
      <div 
        ref={mapRef} 
        className="h-full w-full"
        style={{ visibility: isLoading ? 'hidden' : 'visible' }}
      />
      
      {interactive && (
        <div className="absolute top-4 right-4 bg-white rounded-md shadow p-2 flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-2 hover:bg-gray-100 rounded" 
                  onClick={handleZoomIn}
                  aria-label="Zoom In"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-2 hover:bg-gray-100 rounded" 
                  onClick={handleZoomOut}
                  aria-label="Zoom Out"
                >
                  <Minus className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-2 hover:bg-gray-100 rounded" 
                  onClick={handleMyLocation}
                  aria-label="My Location"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>My Location</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
