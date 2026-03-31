import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import productBlazer from "@/assets/product-blazer.jpg";
import productTrousers from "@/assets/product-trousers.jpg";
import productDress from "@/assets/product-dress.jpg";
import productBag from "@/assets/product-bag.jpg";
import productJeans from "@/assets/product-jeans.jpg";
import productCoat from "@/assets/product-coat.jpg";

const transition = { duration: 0.4, ease: [0.2, 0, 0, 1] as const };

const products = [
  { image: productBlazer, match: "97%", name: "Relaxed Linen Blazer", price: "$495", brand: "Totême", retailer: "Net-a-Porter", tags: ["linen", "blazer"] },
  { image: productTrousers, match: "91%", name: "Wide-Leg Tailored Trousers", price: "$129", brand: "Arket", retailer: "Arket", tags: ["trousers", "wide-leg"] },
  { image: productDress, match: "88%", name: "Slip Midi Dress", price: "$218", brand: "Reformation", retailer: "Reformation", tags: ["slip dress", "midi"] },
  { image: productBag, match: "85%", name: "Mini Leather Shoulder Bag", price: "$350", brand: "A.P.C.", retailer: "A.P.C.", tags: ["shoulder bag", "leather"] },
  { image: productJeans, match: "79%", name: "Straight-Leg Denim Jeans", price: "$198", brand: "Agolde", retailer: "Revolve", tags: ["jeans", "denim"] },
  { image: productCoat, match: "82%", name: "Longline Wool Coat", price: "$299", brand: "Massimo Dutti", retailer: "Massimo Dutti", tags: ["coat", "wool"] },
];

const ProductMatches = () => {
  return (
    <section id="products" className="py-20 md:py-32 px-6 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Product Matches</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4">
              Every piece, <em className="not-italic text-gold-dark italic">instantly shoppable.</em>
            </h2>
          </div>
          <a href="#" className="mt-4 md:mt-0 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Browse all matches <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.name}
              className="group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              viewport={{ once: true }}
              transition={{ ...transition, delay: i * 0.08 }}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-warm-100 mb-3">
                <motion.img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  whileHover={{ scale: 1.06 }}
                  transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] as const }}
                />
                <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-sm">
                  <span className="text-[10px] font-medium text-foreground tabular-nums">{product.match} match</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground leading-snug">{product.name}</h3>
                <p className="text-sm tabular-nums text-muted-foreground mt-0.5">{product.price}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {product.brand} · {product.retailer}
                </p>
                <div className="flex gap-1.5 mt-2">
                  {product.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-warm-100 text-muted-foreground rounded-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center mt-12">
          <button className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-sm text-sm font-medium hover:opacity-90 transition-opacity">
            Find your outfit match
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductMatches;
