import type { SearchAccessState } from "@/lib/searchAccess";

type QuotaBadgeProps = {
  remainingSearches: number;
  state: SearchAccessState;
};

const QuotaBadge = ({ remainingSearches, state }: QuotaBadgeProps) => {
  const baseClasses = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";

  if (remainingSearches === Number.POSITIVE_INFINITY) {
    return <span className={`${baseClasses} bg-emerald-50 text-emerald-700`}>Unlimited searches</span>;
  }

  if (state.status === "auth_required") {
    return <span className={`${baseClasses} bg-amber-50 text-amber-700`}>3 guest searches used</span>;
  }

  return (
    <span className={`${baseClasses} bg-secondary text-secondary-foreground`}>
      {remainingSearches} free {remainingSearches === 1 ? "search" : "searches"} left
    </span>
  );
};

export default QuotaBadge;
