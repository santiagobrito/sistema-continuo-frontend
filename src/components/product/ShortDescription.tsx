"use client";

import { useState, useRef, useEffect, useMemo } from "react";

const COLLAPSE_HEIGHT = 80;

/**
 * Sanitize short description: remove images, headings, iframes.
 * Only allow: p, ul, ol, li, strong, em, br, span (with style for colors).
 */
function sanitizeShortDesc(html: string): string {
  return html
    .replace(/<img[^>]*>/gi, "")
    .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, "")
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<video[^>]*>.*?<\/video>/gi, "")
    .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, "")
    .replace(/<div[^>]*class="[^"]*wp-block[^"]*"[^>]*>/gi, "<div>")
    .trim();
}

export function ShortDescription({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const cleanHtml = useMemo(() => sanitizeShortDesc(html), [html]);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsExpand(contentRef.current.scrollHeight > COLLAPSE_HEIGHT + 20);
    }
  }, [cleanHtml]);

  if (!cleanHtml.replace(/<[^>]*>/g, "").trim()) return null;

  return (
    <div className="mb-4">
      <div
        ref={contentRef}
        className="text-sm text-gray-500 leading-relaxed overflow-hidden transition-[max-height] duration-300 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-sm [&_strong]:text-gray-700 [&_strong]:font-semibold [&_em]:italic [&_p]:mb-1.5"
        style={{ maxHeight: expanded || !needsExpand ? "none" : `${COLLAPSE_HEIGHT}px` }}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs font-semibold text-[#013d5a] hover:underline cursor-pointer flex items-center gap-1"
        >
          {expanded ? "Ver menos" : "Ver mas"}
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
