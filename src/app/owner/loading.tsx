import { CircularMarqueeLoader } from "@/components/ui/CircularMarqueeLoader";

export default function OwnerLoading() {
  return (
    <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center">
        <CircularMarqueeLoader size={200} />
        <h2 className="text-[10px] font-bold tracking-[0.24em] text-text-tertiary uppercase mt-6 animate-pulse">
          Loading Module...
        </h2>
      </div>
    </div>
  );
}
