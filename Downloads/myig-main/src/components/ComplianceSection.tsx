import { motion } from "framer-motion";
import { Shield, Ban, HardDrive, FileText } from "lucide-react";

const transition = { duration: 0.5, ease: [0.2, 0, 0, 1] as const };

const features = [
  {
    icon: Shield,
    title: "Public posts only",
    description: "SearchOutfit only processes public Instagram post links. We never ask for your Instagram login, password, or private account access.",
  },
  {
    icon: Ban,
    title: "Validated processing",
    description: "Uploads are validated, rate-limited, and stored in a private bucket before they are sent to our analysis and shopping-search providers.",
  },
  {
    icon: HardDrive,
    title: "Signed-in saved items sync to your account",
    description: "Unsigned sessions can keep saved products in this browser, while signed-in sessions sync favorites to your SearchOutfit account across devices.",
  },
  {
    icon: FileText,
    title: "Clear data flow",
    description: "We send submitted images to Supabase, Anthropic, and shopping-search providers to generate results. Automated merchant badges and country preferences are best-effort signals rather than guarantees.",
  },
];

const ComplianceSection = () => {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Built with trust</span>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4">
            Transparent <em className="not-italic text-gold-dark italic">by design.</em>
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
            SearchOutfit is designed to be transparent about what it processes, where images go, and how long access lasts. Public Instagram links stay public; uploaded screenshots are handled through private storage and signed links.
          </p>
          <p className="text-xs text-warm-400 mt-2 max-w-lg mx-auto">
            <strong className="text-foreground">Current version:</strong> Product discovery uses live shopping-search providers and AI analysis. Results are generated dynamically rather than from a static mock catalog.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-6 bg-card border border-border rounded-sm cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, boxShadow: "0 8px 24px -8px hsl(0 0% 0% / 0.1)" }}
              whileTap={{ scale: 0.98 }}
              viewport={{ once: true }}
              transition={{ ...transition, delay: i * 0.1 }}
            >
              <feature.icon className="w-5 h-5 text-foreground mb-4" />
              <h3 className="text-sm font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComplianceSection;
