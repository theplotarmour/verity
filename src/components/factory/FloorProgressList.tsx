"use client";

import { useEffect, useRef } from "react";
import { ProductionCard } from "@/components/factory/ProductionCard";

export function FloorProgressList({ recentOrders }: { recentOrders: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || recentOrders.length === 0) return;

    let animationFrameId: number;
    let isPaused = false;

    let scrollPos = 0;
    const scroll = () => {
      if (isPaused) {
        animationFrameId = requestAnimationFrame(scroll);
        return;
      }

      // Scroll speed — matched to FactoryFeed 40s marquee pace
      scrollPos += 0.25;
      container.scrollLeft = scrollPos;

      // One full set width is 1/3 of the total scrolled width since we tripled the array
      const oneSetWidth = container.scrollWidth / 3;
      if (scrollPos >= oneSetWidth) {
        scrollPos = 0;
        container.scrollLeft = 0;
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    // Pause on hover
    const handleMouseEnter = () => {
      isPaused = true;
    };
    const handleMouseLeave = () => {
      isPaused = false;
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [recentOrders]);

  if (recentOrders.length === 0) {
    return (
      <div className="mt-6 text-center py-6 text-xs text-text-tertiary border border-dashed border-border rounded-xl">
        No recent orders in timeline
      </div>
    );
  }

  // Triple items to guarantee overflow and enable infinite scroll
  const tripledItems = [...recentOrders, ...recentOrders, ...recentOrders];

  return (
    <div
      ref={containerRef}
      className="mt-6 [@media(max-height:699px)]:mt-3 flex min-h-0 gap-4 [@media(max-height:699px)]:gap-3 overflow-x-auto pb-1 shrink-0 select-none hide-scrollbar"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {tripledItems.map((order, idx) => {
        // The inspection lives on the QC-stage card — search all cards, not just the first.
        const inspection = order.batches?.find((b: any) => b.inspection)?.inspection;
        return (
        <div key={`${order.id}-${idx}`} className="w-[410px] [@media(max-height:699px)]:w-[280px] shrink-0">
          <ProductionCard
            id={inspection?.id || order.id}
            orderId={order.id}
            batchNumber={order.batches?.[0]?.batchNumber || "Pending"}
            orderNumber={order.orderNumber}
            vehicleName={order.itemName || order.productName || "N/A"}
            quantity={order.quantity}
            workerName={order.worker?.name}
            workerAvatar={null}
            inspectorName={order.inspector?.name}
            inspectorAvatar={null}
            status={order.status}
            submissions={inspection?.submissions || []}
            totalCheckpoints={inspection?.submissions?.length || 1}
            hasReport={!!inspection?.report}
            compact={true}
          />
        </div>
        );
      })}
    </div>
  );
}
