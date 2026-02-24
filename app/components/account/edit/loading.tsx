export default function Loading() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="grid md:grid-cols-2 gap-3">
          <div className="h-12 bg-slate-700 rounded-xl" />
          <div className="h-12 bg-slate-700 rounded-xl" />
        </div>
        <div className="h-32 bg-slate-700 rounded-xl" />
        <div className="flex justify-between gap-4">
          <div className="h-12 w-24 bg-slate-700 rounded-xl" />
          <div className="h-12 w-32 bg-slate-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
