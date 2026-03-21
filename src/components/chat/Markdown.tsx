
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
  className?: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-black text-mac-blue mb-4 mt-2 tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-black text-mac-blue mb-3 mt-6 border-b border-black/[0.05] pb-1 tracking-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold text-mac-navy mb-2 mt-4 tracking-tight">{children}</h3>,
          p: ({ children }) => <p className="mb-4 leading-relaxed text-black/80 font-medium">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="text-black/80 font-medium">{children}</li>,
          hr: () => <hr className="my-6 border-t-2 border-black/[0.03] rounded-full" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-mac-blue/20 pl-4 py-1 my-4 italic text-black/60 bg-mac-blue/[0.02] rounded-r-lg">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-mac-blue/[0.05] px-1.5 py-0.5 rounded text-mac-blue font-mono text-[0.85em] font-bold">
                {children}
              </code>
            ) : (
              <pre className="bg-mac-charcoal text-white/90 p-4 rounded-xl font-mono text-sm overflow-x-auto my-4 shadow-lg">
                <code>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-xl border border-black/[0.05] shadow-sm">
              <table className="w-full text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-black/[0.02]">{children}</thead>,
          th: ({ children }) => <th className="px-4 py-3 font-black text-[11px] uppercase tracking-wider text-black/40 border-b border-black/[0.05]">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 text-sm border-b border-black/[0.03] text-black/70 font-medium">{children}</td>,
          strong: ({ children }) => <strong className="font-extrabold text-black">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
