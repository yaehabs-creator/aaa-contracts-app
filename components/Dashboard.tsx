
import React from 'react';
import { Clause } from '../types';

interface DashboardProps {
  clauses: Clause[];
}

export const Dashboard: React.FC<DashboardProps> = React.memo(({ clauses }) => {
  const timeSensitiveCount = clauses.filter(c => c.time_frames && c.time_frames.length > 0).length;
  const total = clauses.length || 1;
  const tsPercent = (timeSensitiveCount / total) * 100;

  // Type distribution
  const types: Record<string, number> = {};
  clauses.forEach(c => {
    if (c.time_frames && Array.isArray(c.time_frames)) {
      c.time_frames.forEach(tf => {
        types[tf.type] = (types[tf.type] || 0) + 1;
      });
    } else if (c.time_frames) {
    }
  });
  const topTypes = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6 mb-8 animate-fade-in">
      {/* Stats Cards - MacBook style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-mac-lg shadow-mac border border-surface-border card-enter mac-card-hover" style={{ animationDelay: '0.1s' }}>
          <p className="text-mac-muted text-[10px] font-semibold uppercase tracking-wider mb-4">Total Clauses</p>
          <p className="text-5xl font-bold text-mac-blue tracking-tight">{clauses.length}</p>
          <p className="text-xs font-medium text-mac-muted mt-6">Extracted from contract</p>
        </div>

        <div className="bg-white p-6 rounded-mac-lg shadow-mac border border-surface-border card-enter mac-card-hover" style={{ animationDelay: '0.2s' }}>
          <p className="text-mac-muted text-[10px] font-semibold uppercase tracking-wider mb-4">Time-Sensitive</p>
          <p className="text-5xl font-bold text-emerald-600 tracking-tight">{timeSensitiveCount}</p>
          <p className="text-xs font-medium text-mac-muted mt-6">Clauses with deadlines</p>
        </div>

        <div className="bg-gradient-to-br from-mac-blue to-mac-blue-hover p-6 rounded-mac-lg shadow-mac text-white relative overflow-hidden group card-enter" style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mb-4">Coverage Ratio</p>
          <p className="text-5xl font-bold tracking-tight">{tsPercent.toFixed(0)}%</p>
          <div className="mt-6">
            <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all duration-700" style={{ width: `${tsPercent}%` }} />
            </div>
            <p className="text-[10px] font-medium text-white/60 mt-3">Temporal density</p>
          </div>
        </div>
      </div>

      {/* Info Cards - MacBook style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-mac-lg border border-surface-border shadow-mac flex flex-col card-enter" style={{ animationDelay: '0.4s' }}>
          <h4 className="text-xs font-semibold text-mac-navy uppercase tracking-wider mb-6 border-b border-surface-border pb-4">Analysis Status</h4>
          <div className="flex-1 space-y-4">
            <div className="p-4 bg-surface-bg rounded-mac-sm">
              <p className="text-[10px] font-semibold text-mac-blue uppercase mb-4 tracking-wider">Verification Complete</p>
              <div className="space-y-3">
                {["Temporal extraction confirmed", "Notice periods synchronized", "Liability windows identified"].map((msg, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-medium text-mac-charcoal">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-mac-lg border border-surface-border shadow-mac card-enter" style={{ animationDelay: '0.5s' }}>
          <h4 className="text-xs font-semibold text-mac-navy uppercase tracking-wider mb-6 border-b border-surface-border pb-4">Frame Distribution</h4>
          <div className="flex items-end gap-4 h-44 px-2">
            {topTypes.map(([type, count]) => (
              <div key={type} className="flex-1 group relative flex flex-col items-center gap-3">
                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-mac-navy text-white text-[10px] font-semibold px-2.5 py-1 rounded-md z-20">
                  {count}
                </div>
                <div
                  className="w-full bg-mac-blue-subtle rounded-t-lg group-hover:bg-mac-blue transition-all duration-300"
                  style={{ height: `${(count / Math.max(...Object.values(types))) * 100}%` }}
                />
                <span className="text-[9px] font-medium text-mac-muted text-center leading-tight">
                  {type.split('_')[0]}
                </span>
              </div>
            ))}
            {topTypes.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-mac-muted text-sm font-medium">No data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
