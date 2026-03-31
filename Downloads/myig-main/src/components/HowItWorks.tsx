import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import stepShare from "@/assets/step-share.jpg";
import stepAnalyze from "@/assets/step-analyze.jpg";
import stepShop from "@/assets/step-shop.jpg";

const transition = { duration: 0.5, ease: [0.2, 0, 0, 1] as const };

const steps = [
  {
    id: "share",
    number: "01",
    title: "Share the post",
    description: "Paste the URL of any public Instagram post, or upload a screenshot directly from your camera roll.",
    note: "Public posts only · No login required",
    image: stepShare,
  },
  {
    id: "analyze",
    number: "02",
    title: "We analyze the look",
    description: "SearchOutfit identifies each garment — silhouette, color, fabric, and style — using visual pattern matching.",
    note: null,
    image: stepAnalyze,
  },
  {
    id: "shop",
    number: "03",
    title: "Shop the match",
    description: "Browse shoppable product matches with confidence scores. Save favorites and buy directly from the brand.",
    note: null,
    image: stepShop,
  },
] as const;

type StepConfig = (typeof steps)[number];

const pulseTransition = {
  duration: 4.6,
  repeat: Infinity,
  ease: "easeInOut" as const,
};

const StepDemoCard = ({ step }: { step: StepConfig }) => {
  const [loopKey, setLoopKey] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLoopKey((value) => value + 1);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  const restartLoop = () => setLoopKey((value) => value + 1);

  return (
    <div
      className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-warm-100 ring-1 ring-black/5 shadow-[0_30px_80px_rgba(35,24,12,0.10)] cursor-pointer"
      onMouseEnter={restartLoop}
      onFocus={restartLoop}
      onClick={restartLoop}
      role="button"
      tabIndex={0}
      aria-label={`${step.title} live demo`}
    >
      <motion.img
        src={step.image}
        alt={step.title}
        className="w-full h-full object-cover"
        loading="lazy"
        animate={{ scale: [1, 1.035, 1], y: [0, -4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/12" />
      <motion.div
        key={loopKey}
        className="absolute inset-0"
        initial={{ opacity: 0.98 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {step.id === "share" && <ShareDemo />}
        {step.id === "analyze" && <AnalyzeDemo />}
        {step.id === "shop" && <ShopDemo />}
      </motion.div>
    </div>
  );
};

const DemoPill = ({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) => (
  <div
    className={`inline-flex items-center rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/80 shadow-[0_12px_30px_rgba(35,24,12,0.10)] backdrop-blur ${className}`}
  >
    {children}
  </div>
);

const ShareDemo = () => (
  <>
    <motion.div
      className="absolute left-5 top-5"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: [0, 1, 1], y: [-12, 0, 0] }}
      transition={{ ...pulseTransition, times: [0, 0.18, 1] }}
    >
      <DemoPill>Paste URL</DemoPill>
    </motion.div>

    <motion.div
      className="absolute left-6 right-6 top-20 rounded-[1.4rem] border border-white/65 bg-white/92 px-5 py-4 shadow-[0_18px_44px_rgba(35,24,12,0.15)] backdrop-blur"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: [0, 1, 1], y: [18, 0, 0] }}
      transition={{ ...pulseTransition, times: [0.08, 0.26, 1] }}
    >
      <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Instagram link</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm font-medium text-foreground/90 truncate">
          instagram.com/p/closet-look
        </div>
        <motion.div
          className="h-5 w-5 rounded-full bg-gold-dark/10 text-gold-dark grid place-items-center text-xs"
          animate={{ scale: [0.9, 1.08, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.6 }}
        >
          +
        </motion.div>
      </div>
    </motion.div>

    <motion.div
      className="absolute bottom-6 left-6 rounded-[1.3rem] border border-emerald-200/80 bg-white/90 px-4 py-3 shadow-[0_18px_36px_rgba(16,185,129,0.14)] backdrop-blur"
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: [0, 1, 1], scale: [0.92, 1, 1], y: [16, 0, 0] }}
      transition={{ ...pulseTransition, times: [0.22, 0.38, 1] }}
    >
      <div className="text-sm font-semibold text-foreground">Public post detected</div>
      <div className="mt-1 text-xs text-emerald-700">9 photos extracted and ready to analyze</div>
    </motion.div>
  </>
);

const AnalyzeDemo = () => (
  <>
    <motion.div
      className="absolute left-5 top-5"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: [0, 1, 1], y: [-12, 0, 0] }}
      transition={{ ...pulseTransition, times: [0, 0.15, 1] }}
    >
      <DemoPill className="text-rose-600">5 pieces detected</DemoPill>
    </motion.div>

    <motion.div
      className="absolute right-6 top-24 rounded-[1.1rem] border border-white/75 bg-white/92 px-3 py-2 shadow-[0_20px_40px_rgba(35,24,12,0.14)] backdrop-blur"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: [0, 1, 1], x: [24, 0, 0] }}
      transition={{ ...pulseTransition, times: [0.08, 0.25, 1] }}
    >
      <div className="text-sm font-semibold text-foreground">Blazer</div>
      <div className="mt-1 text-xs text-emerald-700">96% confidence</div>
    </motion.div>

    <motion.div
      className="absolute bottom-16 left-7 rounded-[1.1rem] border border-white/75 bg-white/92 px-3 py-2 shadow-[0_20px_40px_rgba(35,24,12,0.14)] backdrop-blur"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: [0, 1, 1], y: [18, 0, 0] }}
      transition={{ ...pulseTransition, times: [0.16, 0.34, 1] }}
    >
      <div className="text-sm font-semibold text-foreground">Trousers</div>
      <div className="mt-1 text-xs text-gold-dark">92% confidence</div>
    </motion.div>

    <motion.div
      className="absolute inset-[20%_22%_26%_18%] rounded-[1.8rem] border border-white/70"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: [0, 0.72, 0.72], scale: [0.96, 1, 1] }}
      transition={{ ...pulseTransition, times: [0.12, 0.28, 1] }}
    />
  </>
);

const MerchantRow = ({
  store,
  price,
  delay,
}: {
  store: string;
  price: string;
  delay: number;
}) => (
  <motion.div
    className="flex items-center justify-between gap-3 rounded-2xl border border-white/75 bg-white/92 px-3 py-3 shadow-[0_16px_36px_rgba(35,24,12,0.10)] backdrop-blur"
    initial={{ opacity: 0, x: 18 }}
    animate={{ opacity: [0, 1, 1], x: [18, 0, 0] }}
    transition={{ ...pulseTransition, delay, times: [0, 0.22, 1] }}
  >
    <div>
      <div className="text-sm font-semibold text-foreground">{store}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">In stock · Free delivery</div>
    </div>
    <div className="text-right">
      <div className="text-sm font-semibold text-foreground">{price}</div>
      <div className="mt-1 rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
        Visit
      </div>
    </div>
  </motion.div>
);

const ShopDemo = () => (
  <>
    <motion.div
      className="absolute left-5 top-5"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: [0, 1, 1], y: [-12, 0, 0] }}
      transition={{ ...pulseTransition, times: [0, 0.16, 1] }}
    >
      <DemoPill>Closest match</DemoPill>
    </motion.div>

    <motion.div
      className="absolute left-6 right-6 top-24 rounded-[1.4rem] border border-white/75 bg-white/92 p-4 shadow-[0_24px_50px_rgba(35,24,12,0.16)] backdrop-blur"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: [0, 1, 1], y: [18, 0, 0] }}
      transition={{ ...pulseTransition, times: [0.08, 0.24, 1] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-foreground">Anna-Kaci Ribbed Knit Set</div>
          <div className="mt-1 text-sm text-muted-foreground">Closest match to your exact look</div>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">94% match</div>
      </div>
    </motion.div>

    <div className="absolute left-6 right-6 bottom-6 space-y-3">
      <MerchantRow store="Target" price="$70.99" delay={0.16} />
      <MerchantRow store="Kohl's" price="$63.00" delay={0.24} />
    </div>
  </>
);

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="pt-10 pb-20 md:pt-16 md:pb-28 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">How It Works</span>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4">
            Three steps to <em className="not-italic text-gold-dark italic">shop any look.</em>
          </h2>
          <p className="text-muted-foreground text-sm mt-3 max-w-md mx-auto">
            From discovery to cart in under 60 seconds. Works with any public Instagram post.
          </p>
        </div>

        <div className="space-y-16 md:space-y-24">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ ...transition, delay: 0.1 }}
            >
              <div className={`${i % 2 === 1 ? 'md:order-2' : ''}`}>
                <span className="text-5xl font-light text-warm-200 tabular-nums">{step.number}</span>
                <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mt-2 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  {step.description}
                </p>
                {step.note && (
                  <p className="text-xs text-muted-foreground mt-3">{step.note}</p>
                )}
              </div>
              <div className={`${i % 2 === 1 ? 'md:order-1' : ''}`}>
                <StepDemoCard step={step} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
