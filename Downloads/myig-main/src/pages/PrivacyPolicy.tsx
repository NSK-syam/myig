import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-6">
            Privacy Policy
          </h1>
          <div className="space-y-6 text-sm leading-7 text-muted-foreground">
            <p>
              We collect email auth data, analytics events, saved items, and submitted images so SearchOutfit can sign users in, process outfit searches, sync favorites for signed-in users, and measure core product usage.
            </p>
            <p>
              Submitted screenshots, image URLs, and public Instagram post links may be processed by Supabase, Anthropic, and shopping-search providers to generate outfit analysis and merchant results. Signed-in saved products sync to your account; unsigned sessions can still use local browser storage for convenience.
            </p>
            <p>
              Country preferences and merchant badges are best-effort product signals rather than guarantees of shipping, local availability, or merchant authorization. Use SearchOutfit only with images and content you are comfortable sending through those services.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
