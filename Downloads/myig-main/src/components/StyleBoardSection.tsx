import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import productBlazer from "@/assets/product-blazer.jpg";
import productDress from "@/assets/product-dress.jpg";
import productJeans from "@/assets/product-jeans.jpg";

const transition = { duration: 0.5, ease: [0.2, 0, 0, 1] as const };

const benefits = [
  "Save product matches to your style board and sync them when you sign in",
  "Organized by category, color, and source look",
  "Direct buy links preserved",
];

const StyleBoardSection = () => {
  return (
    <section className="py-20 md:py-32 px-6 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image stack */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={transition}
          >
            <motion.div 
              className="relative w-64 h-80 cursor-pointer"
              whileHover={{ scale: 1.12 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            >
              <motion.div 
                className="absolute top-0 left-0 w-44 h-56 rounded-sm overflow-hidden shadow-lg transform -rotate-6 cursor-pointer"
                whileHover={{ scale: 1.08, rotate: -3, zIndex: 30 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] as const }}
              >
                <img src={productBlazer} alt="Saved blazer" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div 
                className="absolute top-4 left-24 w-44 h-56 rounded-sm overflow-hidden shadow-lg transform rotate-3 cursor-pointer"
                whileHover={{ scale: 1.08, rotate: 0, zIndex: 30 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] as const }}
              >
                <img src={productDress} alt="Saved dress" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div 
                className="absolute top-10 left-12 w-44 h-56 rounded-sm overflow-hidden shadow-lg transform -rotate-2 cursor-pointer"
                whileHover={{ scale: 1.08, rotate: 2, zIndex: 30 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] as const }}
              >
                <img src={productJeans} alt="Saved jeans" className="w-full h-full object-cover" />
              </motion.div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm rounded-sm px-3 py-1.5 shadow-md">
                <p className="text-xs font-medium text-foreground">12 saved looks</p>
                <p className="text-[10px] text-muted-foreground">Your style board</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...transition, delay: 0.2 }}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your Style Board</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4 mb-4">
              Save looks, <em className="not-italic text-gold-dark italic">shop later.</em>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-8">
              Heart any product match and it lands in your personal style board. Use it instantly without an account, then sign in when you want your saved looks to sync across devices.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button className="flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background rounded-sm text-sm font-medium hover:opacity-90 transition-opacity">
                View saved items
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center gap-2 px-5 py-3 border border-border text-foreground rounded-sm text-sm font-medium hover:bg-warm-50 transition-colors">
                Start discovering
              </button>
            </div>

            <ul className="space-y-2.5">
              {benefits.map(benefit => (
                <li key={benefit} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StyleBoardSection;
