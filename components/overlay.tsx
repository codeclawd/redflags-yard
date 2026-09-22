"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closer.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/85 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel w-full max-w-[640px] p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-[28px] leading-none tracking-[-0.01em] text-parchment">
            {title}
          </h2>
          <button
            ref={closer}
            type="button"
            onClick={onClose}
            className="rounded-[3px] border border-rope p-1.5 text-parchment hover:border-amber"
          >
            <X aria-hidden className="size-4" strokeWidth={2} />
            <span className="sr-only">Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
