import { useEffect, useRef, useState } from "react";
import { Entry, Project } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface MapViewProps {
  entries: Entry[];
  openNewEntryModal: () => void;
  openEntryDetailModal: (entry: Entry) => void;
  selectedProject: Project | null;
  isLoading: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function MapView({ 
  entries, 
  openNewEntryModal, 
  openEntryDetailModal,
  selectedProject,
  isLoading 
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!window.L || !mapRef.current || mapInstanceRef.current) return;

    // Default center (San Francisco)
    const defaultCenter = [37.7749, -122.4194];
    
    // Create map
    const map = window.L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
    });

    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Store map instance
    mapInstanceRef.current = map;
    setMapInitialized(true);

    // Add click handler to create entries
    map.on('click', (e: any) => {
      if (!selectedProject) return;
      
      const { lat, lng } = e.latlng;
      console.log(`Clicked at ${lat}, ${lng}`);
      // Here we could open the new entry modal with pre-filled coordinates
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when entries change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInitialized) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    if (entries.length === 0) return;
    
    // Create bounds to fit all markers
    const bounds = window.L.latLngBounds();
    
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
    
    // Add markers for each entry
    entries.forEach(entry => {
      if (!entry.latitude || !entry.longitude) return;
      
      const lat = parseFloat(entry.latitude);
      const lng = parseFloat(entry.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      const marker = window.L.marker([lat, lng], { 
        icon: createCustomIcon(entry.entryType) 
      }).addTo(mapInstanceRef.current);
      
      // Add popup with entry title
      marker.bindPopup(`
        <div class="font-medium">${entry.title}</div>
        <div class="text-xs text-gray-600 mt-1">Click to view details</div>
      `);
      
      // Open entry detail modal when marker is clicked
      marker.on('click', () => {
        openEntryDetailModal(entry);
      });
      
      // Add to bounds
      bounds.extend([lat, lng]);
      
      // Save marker reference for cleanup
      markersRef.current.push(marker);
    });
    
    // Fit map to bounds if we have markers
    if (markersRef.current.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [entries, mapInitialized, openEntryDetailModal]);

  // Function to handle location tracking
  const handleMyLocation = () => {
    if (!mapInstanceRef.current) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapInstanceRef.current.setView([latitude, longitude], 15);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please check your browser permissions.");
      }
    );
  };

  return (
    <div className="flex-1 h-1/2 md:h-full z-10 relative">
      <div ref={mapRef} className="h-full w-full"></div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-20">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span className="text-sm font-medium text-gray-700">Loading map data...</span>
          </div>
        </div>
      )}
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
        <button 
          className="bg-white rounded-md shadow p-2 hover:bg-gray-50" 
          title="Zoom In"
          onClick={() => mapInstanceRef.current?.zoomIn()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
        <button 
          className="bg-white rounded-md shadow p-2 hover:bg-gray-50" 
          title="Zoom Out"
          onClick={() => mapInstanceRef.current?.zoomOut()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <button 
          className="bg-white rounded-md shadow p-2 hover:bg-gray-50" 
          title="My Location"
          onClick={handleMyLocation}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Add Entry Button (Mobile) */}
      <button 
        onClick={openNewEntryModal}
        className="md:hidden absolute right-4 bottom-20 bg-primary text-white rounded-full p-4 shadow-lg z-30"
        disabled={!selectedProject}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
