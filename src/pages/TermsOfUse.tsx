import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-6">
            Terms of Use
          </h1>
          <div className="space-y-6 text-sm leading-7 text-muted-foreground">
            <p>
              You represent that you have the right or permission to submit any link, screenshot, or image for SearchOutfit to process.
            </p>
            <p>
              SearchOutfit provides automated outfit analysis, merchant badges, and product discovery on a best-effort basis. Official Store, Authorized Retailer, Resale, and country-specific shopping results are signals generated from upstream providers and should not be treated as legal, shipping, or authenticity guarantees.
            </p>
            <p>
              You should only use public Instagram links, public image URLs, or screenshots you are authorized to use. If a post is private, unavailable, or not suitable for outfit analysis, SearchOutfit may reject it or ask for a different image.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfUse;
