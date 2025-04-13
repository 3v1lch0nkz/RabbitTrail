// Simple SVG marker for Leaflet
export const createCustomMarker = (window: Window, color = '#2563EB') => {
  // Create a simple SVG marker
  const svgMarker = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z" fill="${color}"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `;
  
  // Convert to base64 data URL
  const svgBase64 = `data:image/svg+xml;base64,${btoa(svgMarker)}`;
  
  // Create custom icon
  const customIcon = window.L.icon({
    iconUrl: svgBase64,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36]
  });
  
  return customIcon;
};

// Marker with different colors based on entry type
export const createEntryMarker = (window: Window, entry: any) => {
  // Determine marker color based on entry type
  let markerColor = '#6B7280'; // Default gray
  
  // If entry has an image, use green marker for evidence
  if (entry.mediaUrlImage) {
    markerColor = '#047857'; // Green
  } 
  // If entry has audio, use blue marker for interviews
  else if (entry.mediaUrlAudio) {
    markerColor = '#4F46E5'; // Blue
  }
  // If no media but has a title with "found" or "spotted", use orange for lead
  else if (entry.title.toLowerCase().includes("found") || 
           entry.title.toLowerCase().includes("spotted")) {
    markerColor = '#C2410C'; // Orange
  }
  
  return createCustomMarker(window, markerColor);
};