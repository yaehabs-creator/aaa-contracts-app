import React from 'react';
import { useAppStore } from '@/store/useAppStore';

export const AnalyzingView: React.FC = () => {
  const {
    inputMode,
    batchInfo,
    activeStage,
    progress,
    liveStatus,
    preprocessingInfo,
  } = useAppStore();

  if (!activeStage) return null;

  return (
    <div className="flex flex-col items-center justify-center py-40 space-y-12 text-center max-w-2xl mx-auto">
      <div className="w-full space-y-6">
        <div className="flex justify-between items-end">
          <div className="text-left">
            {inputMode !== 'text' && (
              <p className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.4em] mb-1">Batch {batchInfo.current} / {batchInfo.total}</p>
            )}
            <h3 className="text-3xl font-black text-aaa-blue tracking-tighter">{activeStage.label}</h3>
          </div>
          <span className="text-4xl font-black text-aaa-blue mono">{progress}%</span>
        </div>
        <div className="w-full h-4 bg-aaa-bg rounded-full overflow-hidden p-1 border border-aaa-border shadow-inner">
          <div className="h-full bg-gradient-to-r from-aaa-blue to-aaa-accent rounded-full transition-all duration-300 shadow-lg relative" style={{ width: `${progress}%` }}>
            <div className="absolute inset-0 bg-white/20 shimmer" />
          </div>
        </div>
        <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">{activeStage.sub}</p>

        {/* Live Status Indicator */}
        {liveStatus.message && (
          <div className="mt-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 shadow-md">
            <div className="flex items-center gap-3">
              {liveStatus.isActive && (
                <div className="relative">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-cyan-700">{liveStatus.message}</p>
                <p className="text-xs text-cyan-600 mt-0.5">{liveStatus.detail}</p>
              </div>
            </div>

            {/* Process Timeline for Chunks */}
            {batchInfo.total > 1 && (
              <div className="mt-3 pt-3 border-t border-cyan-200">
                <div className="flex gap-2">
                  {Array.from({ length: batchInfo.total }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-1.5 rounded-full transition-all ${idx < batchInfo.current
                        ? 'bg-green-400'
                        : idx === batchInfo.current - 1
                          ? 'bg-cyan-500 animate-pulse'
                          : 'bg-cyan-200'
                        }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-cyan-600 mt-1.5 text-center">
                  {batchInfo.current} of {batchInfo.total} chunks processed
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preprocessing Information Display */}
        {preprocessingInfo && (
          <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-lg">
            <div className="text-left space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-aaa-blue">Text Preprocessing Complete</h4>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                    {preprocessingInfo.generalFixes + preprocessingInfo.particularFixes} fixes applied
                  </span>
                  {preprocessingInfo.estimatedClauses > 0 && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                      ~{preprocessingInfo.estimatedClauses} clauses detected
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-white/60 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">General Text</p>
                  <p className="text-sm font-bold text-aaa-blue">{preprocessingInfo.generalFixes} issues fixed</p>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Particular Text</p>
                  <p className="text-sm font-bold text-aaa-blue">{preprocessingInfo.particularFixes} issues fixed</p>
                </div>
              </div>

              {/* Token Usage Display */}
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-bold text-purple-700">Token Usage</h5>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${preprocessingInfo.tokenInfo.usagePercentage < 50
                    ? 'bg-green-100 text-green-700'
                    : preprocessingInfo.tokenInfo.usagePercentage < 80
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                    {preprocessingInfo.tokenInfo.usagePercentage}% of budget
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Input Tokens (Estimated):</span>
                    <span className="font-mono font-bold text-purple-700">
                      {preprocessingInfo.tokenInfo.inputTokens.toLocaleString()} / {preprocessingInfo.tokenInfo.totalTokenBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${preprocessingInfo.tokenInfo.usagePercentage < 50
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : preprocessingInfo.tokenInfo.usagePercentage < 80
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                          : 'bg-gradient-to-r from-red-400 to-red-500'
                        }`}
                      style={{ width: `${preprocessingInfo.tokenInfo.usagePercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2">
                    <span className="text-gray-600">Output Token Limit:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {preprocessingInfo.tokenInfo.outputTokenLimit.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Model: Claude Sonnet 4.5 • Context Window: {preprocessingInfo.tokenInfo.totalTokenBudget.toLocaleString()} tokens
                  </div>
                </div>
              </div>

              {preprocessingInfo.fixes.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Sample Fixes Applied:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {preprocessingInfo.fixes.map((fix, idx) => (
                      <div key={idx} className="text-xs p-2 bg-white/80 rounded border border-blue-100">
                        <span className="font-mono text-red-600 line-through mr-2">{fix.original}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-mono text-green-600 ml-2">{fix.fixed}</span>
                        <span className="text-gray-500 ml-2 text-[10px]">({fix.reason})</span>
                      </div>
                    ))}
                  </div>
                  {preprocessingInfo.generalFixes + preprocessingInfo.particularFixes > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{preprocessingInfo.generalFixes + preprocessingInfo.particularFixes - 10} more fixes...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
