import { useState } from "react";
import { Entry } from "@shared/schema";
import EntryCard from "./EntryCard";
import { Loader2 } from "lucide-react";

interface EntriesPanelProps {
  entries: Entry[];
  openNewEntryModal: () => void;
  openEntryDetailModal: (entry: Entry) => void;
  isLoading: boolean;
}

export default function EntriesPanel({ 
  entries, 
  openNewEntryModal, 
  openEntryDetailModal,
  isLoading 
}: EntriesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter entries based on search query
  const filteredEntries = entries.filter(entry => 
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.description && entry.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white border-t md:border-t-0 md:border-l border-gray-200 h-1/2 md:h-full md:w-96 flex-shrink-0 flex flex-col overflow-hidden z-20">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
        <h2 className="font-semibold text-gray-900">Entries</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search entries..." 
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button 
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery("")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button 
            onClick={openNewEntryModal}
            className="bg-primary text-white p-1.5 rounded-md hidden md:block"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Entry List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {entries.length === 0 ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No entries yet</h3>
                <p className="text-sm text-gray-500 mb-4">Add your first entry to get started</p>
                <button 
                  onClick={openNewEntryModal}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium"
                >
                  Add First Entry
                </button>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No entries found</h3>
                <p className="text-sm text-gray-500">Try a different search term</p>
              </>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <EntryCard 
              key={entry.id}
              entry={entry}
              onClick={() => openEntryDetailModal(entry)}
            />
          ))
        )}
      </div>
    </div>
  );
}
