import { useState } from "react";
import { Entry, Project, User } from "@shared/schema";
import { Search, ArrowUpDown, Plus, MoreVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import EntryCard from "./entry-card";

interface EntryListProps {
  project: Project;
  entries: Entry[];
  isLoading: boolean;
  users: User[];
  onAddEntry: () => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entryId: number) => void;
  onProjectActions?: () => void;
}

type SortOption = "newest" | "oldest" | "alphabetical";

const EntryList = ({ 
  project, 
  entries, 
  isLoading, 
  users,
  onAddEntry, 
  onEditEntry, 
  onDeleteEntry,
  onProjectActions
}: EntryListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<"list" | "timeline">("list");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  
  // Find creator for each entry
  const getCreator = (createdById: number): User | undefined => {
    return users.find(user => user.id === createdById);
  };
  
  // Filter entries by search query
  const filteredEntries = entries.filter(entry => 
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.description && entry.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Sort entries based on selected option
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    switch (sortOption) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "alphabetical":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">{project.title}</h1>
          <div className="flex gap-2">
            <Button 
              className="hidden md:flex"
              onClick={onAddEntry}
            >
              New Entry
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onProjectActions}>
                  Project Actions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                <span className="text-sm font-medium">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortOption("newest")}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("oldest")}>
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("alphabetical")}>
                Alphabetical
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Entry View Toggle */}
        <Tabs defaultValue="list" className="mt-3" onValueChange={(value) => setViewType(value as "list" | "timeline")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Entries List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No entries yet</h3>
            <p className="text-sm text-gray-600 mb-4">Add your first entry to this investigation</p>
            <Button onClick={onAddEntry}>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        ) : (
          viewType === "list" ? (
            sortedEntries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                creator={getCreator(entry.createdById)}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
              />
            ))
          ) : (
            <div className="relative pl-8 border-l-2 border-gray-200 py-2">
              {sortedEntries.map((entry, index) => (
                <div key={entry.id} className="mb-8 relative">
                  <div className="absolute -left-10 w-4 h-4 rounded-full bg-primary border-4 border-white"></div>
                  <div className="mb-1 text-sm font-medium text-gray-500">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </div>
                  <EntryCard
                    entry={entry}
                    creator={getCreator(entry.createdById)}
                    onEdit={onEditEntry}
                    onDelete={onDeleteEntry}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>
      
      {/* Add Entry Button (Mobile) */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <Button 
          className="rounded-full w-16 h-16 shadow-lg p-0 bg-primary hover:bg-primary/90"
          onClick={onAddEntry}
        >
          <Plus className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
};

export default EntryList;
