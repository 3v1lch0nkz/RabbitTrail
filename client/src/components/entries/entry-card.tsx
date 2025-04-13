import { useState } from "react";
import { Entry, User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Image, Music, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EntryCardProps {
  entry: Entry;
  creator?: User;
  onEdit: (entry: Entry) => void;
  onDelete: (entryId: number) => void;
}

const EntryCard = ({ entry, creator, onEdit, onDelete }: EntryCardProps) => {
  const [isHovering, setIsHovering] = useState(false);
  
  const formattedDate = entry.createdAt instanceof Date 
    ? formatDistanceToNow(entry.createdAt, { addSuffix: true })
    : formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true });

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-lg text-gray-900">{entry.title}</h3>
          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{formattedDate}</span>
        </div>
        
        <div className="mt-2 text-sm text-gray-600 line-clamp-2">
          {entry.description || "No description provided"}
        </div>
        
        {(entry.latitude && entry.longitude) && (
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <MapPin className="w-4 h-4 mr-1" />
            <span>
              {/* This would be replaced with a proper location lookup in a production app */}
              {`${entry.latitude.substring(0, 6)}, ${entry.longitude.substring(0, 6)}`}
            </span>
          </div>
        )}
        
        {/* Media Preview */}
        {(entry.mediaUrlImage || entry.mediaUrlAudio) && (
          <div className="mt-3 flex gap-2">
            {entry.mediaUrlImage && (
              <div className="h-20 w-20 rounded-md bg-gray-100 overflow-hidden relative">
                <img 
                  src={entry.mediaUrlImage} 
                  alt={`Image for ${entry.title}`} 
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-0 right-0 m-1 p-1 bg-black bg-opacity-50 rounded-full">
                  <Image className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
            
            {entry.mediaUrlAudio && (
              <div className="h-20 w-20 rounded-md bg-gray-100 overflow-hidden relative flex items-center justify-center">
                <Music className="w-8 h-8 text-gray-400" />
                <div className="absolute bottom-0 right-0 m-1 p-1 bg-black bg-opacity-50 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3 h-3 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {creator ? `Added by ${creator.displayName || creator.username}` : "Added by you"}
            </span>
          </div>
          <div className="flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`p-1 ${isHovering ? 'text-gray-600' : 'text-gray-400'} hover:text-gray-600`} 
                    onClick={() => onEdit(entry)}
                    aria-label="Edit entry"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <button 
                        className={`p-1 ${isHovering ? 'text-gray-600' : 'text-gray-400'} hover:text-red-500`}
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this entry. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(entry.id)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryCard;
