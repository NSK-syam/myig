import { SEARCH_MARKETS, type SearchMarketCode } from "@/lib/market";

interface CountrySelectProps {
  value: SearchMarketCode;
  onChange: (value: SearchMarketCode) => void;
}

const CountrySelect = ({ value, onChange }: CountrySelectProps) => {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="uppercase tracking-wider font-medium whitespace-nowrap">Shop in</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SearchMarketCode)}
        className="h-9 rounded-sm border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Shop country"
      >
        {SEARCH_MARKETS.map((market) => (
          <option key={market.code} value={market.code}>
            {market.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default CountrySelect;
