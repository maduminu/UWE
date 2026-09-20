import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * UWE tactical dark-mode Markdown renderer.
 * Supports: bold, italic, inline code, code blocks, bullet lists, numbered lists, links.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`uwe-markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks & inline code
          code({ className: codeClass, children, ...props }) {
            const isInline = !codeClass;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-[#1A2038] border border-outline-variant/30 text-secondary font-mono-data text-[11px]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3.5 rounded-lg bg-[#070B14] border border-outline-variant/30 overflow-x-auto my-2">
                <code className={`font-mono-data text-[11px] text-on-surface leading-relaxed ${codeClass || ''}`} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Paragraphs
          p({ children }) {
            return <p className="text-on-surface text-xs leading-relaxed mb-1.5 last:mb-0">{children}</p>;
          },
          // Bold
          strong({ children }) {
            return <strong className="text-secondary font-bold">{children}</strong>;
          },
          // Italic
          em({ children }) {
            return <em className="text-on-surface-variant italic">{children}</em>;
          },
          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00D2FF] hover:underline transition-colors"
              >
                {children}
              </a>
            );
          },
          // Unordered lists
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-0.5 ml-2 text-on-surface text-xs">{children}</ul>;
          },
          // Ordered lists
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-0.5 ml-2 text-on-surface text-xs">{children}</ol>;
          },
          // List items
          li({ children }) {
            return <li className="text-on-surface text-xs leading-relaxed">{children}</li>;
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-secondary/60 pl-3 my-2 text-on-surface-variant italic text-xs">
                {children}
              </blockquote>
            );
          },
          // Headings
          h1({ children }) {
            return <h1 className="text-sm font-bold text-on-surface mb-1">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xs font-bold text-on-surface mb-1">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xs font-bold text-secondary mb-1">{children}</h3>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
