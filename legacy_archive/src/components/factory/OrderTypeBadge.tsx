// Small chip for a sales order's type (Retail / Dealer / OEM / Internal), also
// reused for customer tags. Retail is the default and stays unlabelled to avoid
// badge noise; only the distinguishing types get a chip.
export function OrderTypeBadge({ orderType }: { orderType?: string | null }) {
  if (!orderType || orderType === "RETAIL") return null;
  const label = orderType === "DEALER" ? "Dealer" : orderType === "OEM" ? "OEM" : "Internal";
  const tone =
    orderType === "DEALER" ? "bg-brand-soft text-brand-strong"
    : orderType === "OEM" ? "bg-warning-soft text-warning"
    : "bg-surface-2 text-text-secondary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}
