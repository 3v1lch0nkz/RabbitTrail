import { Entry } from "@shared/schema";
import { format } from "date-fns";

interface EntryCardProps {
  entry: Entry;
  onClick: () => void;
}

// Function to get the entry type badge
function EntryTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "evidence":
      return <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Evidence</span>;
    case "lead":
      return <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Lead</span>;
    case "interview":
      return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Interview</span>;
    default:
      return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">Note</span>;
  }
}

// Function to format distance
function formatDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return "";
  }
  
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lat1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Return formatted distance with direction
  if (distance < 0.1) return "nearby";
  
  const direction = getDirection(lat1, lon1, lat2, lon2);
  return `${distance.toFixed(1)} mi ${direction}`;
}

// Function to get cardinal direction
function getDirection(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  let dir = "";
  
  if (dLat > 0) {
    dir += "N";
  } else if (dLat < 0) {
    dir += "S";
  }
  
  if (dLon > 0) {
    dir += "E";
  } else if (dLon < 0) {
    dir += "W";
  }
  
  return dir;
}

export default function EntryCard({ entry, onClick }: EntryCardProps) {
  // Truncate description for preview
  const truncatedDescription = entry.description
    ? entry.description.length > 120
      ? `${entry.description.substring(0, 120)}...`
      : entry.description
    : "";
  
  // Format date
  const formattedDate = entry.createdAt
    ? format(new Date(entry.createdAt), "MMM d, yyyy")
    : "";
  
  // Check if entry has image
  const hasImage = !!entry.mediaUrlImage;
  
  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {hasImage && (
        <div className="relative h-36 bg-gray-100">
          <img 
            src={entry.mediaUrlImage} 
            alt={entry.title} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-gray-900">{entry.title}</h3>
          <EntryTypeBadge type={entry.entryType} />
        </div>
        
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{truncatedDescription}</p>
        
        <div className="flex items-center text-xs text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{formattedDate}</span>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          {entry.creator && (
            <div className="flex items-center space-x-1">
              <span className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-primary">
                {entry.creator.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">{entry.creator.displayName}</span>
            </div>
          )}
          
          <div className="flex space-x-2 text-gray-400">
            {entry.mediaUrlImage && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            {entry.mediaUrlAudio && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 017.072 0m-9.9-2.828a9 9 0 0112.728 0" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
