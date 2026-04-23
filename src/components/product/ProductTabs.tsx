"use client";

import { useState, useEffect, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  count?: number;
}

export function ProductTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  // Activar tab "reviews" al llegar con ?review=1 (desde email post-compra).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("review") === "1" && tabs.some((t) => t.id === "reviews")) {
      setActive("reviews");
    }
  }, [tabs]);

  const visibleTabs = tabs.filter((t) => t.content);

  return (
    <div>
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto -mb-px">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active === tab.id
                  ? "border-[#013d5a] text-[#013d5a]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="py-6">
        {visibleTabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
