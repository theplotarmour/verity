import { Loader2 } from "lucide-react";

export default function WorkerLoading() {
  return (
    <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-neu-sm flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 bg-brand/5 rounded-2xl animate-pulse"></div>
          <Loader2 className="w-8 h-8 text-brand animate-spin relative z-10" />
        </div>
        <p className="text-sm font-bold text-text-tertiary uppercase tracking-widest animate-pulse">Loading Workspace...</p>
      </div>
    </div>
  );
}
