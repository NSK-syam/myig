const items = [
  "48 products indexed",
  "Public posts only",
  "Instant matching",
  "Save your favorites",
  "No account needed",
  "Tops · Bottoms · Dresses · Shoes · Bags",
  "Updated daily",
];

const MarqueeStrip = () => {
  return (
    <div className="w-full overflow-hidden border-y border-border py-3 bg-card">
      <div className="animate-marquee flex whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="mx-6 text-xs text-muted-foreground">
            {item}
            <span className="ml-6 text-warm-300">·</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeStrip;
