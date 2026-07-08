"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  fallbackHref,
  label,
  className = "back-link",
  iconOnly = false,
}: {
  fallbackHref: string;
  label: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      {iconOnly ? (
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            d="M11 4.5L6.5 9L11 13.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        label
      )}
    </button>
  );
}
