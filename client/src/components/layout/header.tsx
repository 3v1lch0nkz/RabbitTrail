import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Map, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "?";
    if (user.displayName) {
      return user.displayName
        .split(" ")
        .map(name => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center gap-2">
          <Map className="w-8 h-8 text-primary" />
          <Link href="/">
            <span className="font-semibold text-xl text-primary cursor-pointer">RabbitTrail</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/">
            <span className={`font-medium ${location === '/' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>
              Projects
            </span>
          </Link>
          <Button onClick={() => window.location.href = "/projects/new"}>
            New Project
          </Button>
        </nav>
        
        {/* User Menu (Desktop) */}
        <div className="hidden md:flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border-2 border-primary">
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName || user?.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button 
            type="button" 
            className="text-gray-500 hover:text-gray-700 focus:outline-none" 
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={`md:hidden bg-white border-t border-gray-200 px-2 pt-2 pb-3 space-y-1 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <Link href="/">
          <span className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">
            Projects
          </span>
        </Link>
        <Link href="/account">
          <span className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">
            Account
          </span>
        </Link>
        <button 
          className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
          onClick={handleLogout}
        >
          Sign out
        </button>
        <button className="w-full mt-1 bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition">
          New Project
        </button>
      </div>
    </header>
  );
};

export default Header;
