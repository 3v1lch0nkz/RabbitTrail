import { Link, useLocation } from "wouter";
import { Map, Users, User } from "lucide-react";

const MobileNav = () => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-white border-t border-gray-200 py-2 z-10">
      <Link href="/">
        <div className={`flex flex-col items-center px-3 py-1 ${isActive('/') ? 'text-primary' : 'text-gray-500'} cursor-pointer`}>
          <Map className="w-6 h-6" />
          <span className="text-xs mt-1">Projects</span>
        </div>
      </Link>
      <Link href="/team">
        <div className={`flex flex-col items-center px-3 py-1 ${isActive('/team') ? 'text-primary' : 'text-gray-500'} cursor-pointer`}>
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">Team</span>
        </div>
      </Link>
      <Link href="/account">
        <div className={`flex flex-col items-center px-3 py-1 ${isActive('/account') ? 'text-primary' : 'text-gray-500'} cursor-pointer`}>
          <User className="w-6 h-6" />
          <span className="text-xs mt-1">Account</span>
        </div>
      </Link>
    </nav>
  );
};

export default MobileNav;
