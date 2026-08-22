import { CircularMarqueeLoader } from "@/components/ui/CircularMarqueeLoader";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center">
        <CircularMarqueeLoader size={200} />
        <h2 className="text-sm font-bold tracking-[0.24em] text-text-tertiary uppercase mt-6">
          System Initializing
        </h2>
      </div>
    </div>
  );
}
