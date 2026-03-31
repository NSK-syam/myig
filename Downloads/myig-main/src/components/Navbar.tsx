import { Heart, Loader2, LogOut, UserRound } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Link, useLocation, useNavigate } from "react-router-dom";

import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/components/AuthProvider";
import searchOutfitLogo from "@/assets/searchoutfit-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, signOut, user } = useAuth();
  const { toast } = useToast();
  const isHomepage = location.pathname === "/";
  const isNativeApp = Capacitor.isNativePlatform();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Signed out", description: "Your SearchOutfit session has ended on this device." });
    } catch (error) {
      toast({
        title: "Could not sign out",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link aria-label="Go to SearchOutfit home" className="flex items-center gap-2" to="/">
          <img
            alt="SearchOutfit logo"
            className="h-8 w-auto rounded-sm object-contain"
            src={searchOutfitLogo}
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">SearchOutfit</span>
        </Link>

        {!isNativeApp && (
          <div className="hidden md:flex items-center gap-8">
            <a href={isHomepage ? "#discover" : "/#discover"} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Discover</a>
            <a href={isHomepage ? "#how-it-works" : "/#how-it-works"} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Search</a>
            <a href={isHomepage ? "#products" : "/#products"} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Outfit Detail</a>
          </div>
        )}

        <div className="flex items-center gap-3">
          {!isHomepage && (
            <button onClick={() => navigate("/account")} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground border border-border rounded-sm hover:bg-card transition-colors">
              <UserRound className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </button>
          )}
          <button onClick={() => navigate("/saved")} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground border border-border rounded-sm hover:bg-card transition-colors">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Saved</span>
          </button>
          {loading ? (
            <Button className="px-4" disabled variant="outline">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={isHomepage ? "rounded-full px-3" : "gap-2"} variant="outline">
                  <UserRound className="h-4 w-4" />
                  {!isHomepage && <span className="max-w-28 truncate">{user.email}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
                <DropdownMenuItem className="pointer-events-none opacity-80">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/saved")}>
                  View saved items
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <AuthDialog
              triggerClassName={isHomepage
                ? "flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-card transition-colors"
                : undefined}
              triggerLabel="Sign in"
            />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
