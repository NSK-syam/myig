import searchOutfitLogo from "@/assets/searchoutfit-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <img
              alt="SearchOutfit logo"
              className="h-7 w-auto rounded-sm object-contain"
              src={searchOutfitLogo}
            />
            <span className="text-sm font-semibold tracking-tight text-foreground">SearchOutfit</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <a href="/instagram-outfit-search/" className="hover:text-foreground transition-colors">
              Instagram Outfit Search
            </a>
            <a href="/screenshot-outfit-finder/" className="hover:text-foreground transition-colors">
              Screenshot Outfit Finder
            </a>
            <a href="/find-clothes-from-photo/" className="hover:text-foreground transition-colors">
              Find Clothes From a Photo
            </a>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms of Use
            </a>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 SearchOutfit. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
