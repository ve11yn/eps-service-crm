"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ProjectFiltersProps = {
  initialQuery: string;
  initialStatus: string;
};

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "qa_review", label: "QA Review" },
  { value: "invoiced", label: "Invoiced" },
  { value: "completed", label: "Completed" },
];

function buildProjectsUrl(query: string, status: string) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();

  if (normalizedQuery) params.set("q", normalizedQuery);
  if (status) params.set("status", status);

  const queryString = params.toString();
  return queryString ? `/projects?${queryString}` : "/projects";
}

export function ProjectFilters({
  initialQuery,
  initialStatus,
}: ProjectFiltersProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const normalizedInitial = useMemo(
    () => ({
      query: initialQuery.trim(),
      status: initialStatus,
    }),
    [initialQuery, initialStatus],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (
        query.trim() === normalizedInitial.query &&
        status === normalizedInitial.status
      ) {
        return;
      }

      startTransition(() => {
        router.replace(buildProjectsUrl(query, status));
      });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [normalizedInitial, query, router, status]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!statusDropdownRef.current?.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsStatusOpen(false);
      }
    }

    if (!isStatusOpen) return;

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isStatusOpen]);

  function updateStatus(nextStatus: string) {
    setStatus(nextStatus);
    setIsStatusOpen(false);
    startTransition(() => {
      router.replace(buildProjectsUrl(query, nextStatus));
    });
  }

  const selectedStatusLabel =
    statusOptions.find((option) => option.value === status)?.label ??
    "All statuses";

  return (
    <div className="toolbar-form" role="search">
      <input
        className="input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search project"
        aria-label="Search projects"
      />
      <div className="project-status-dropdown" ref={statusDropdownRef}>
        <button
          type="button"
          className="project-status-button"
          aria-haspopup="listbox"
          aria-expanded={isStatusOpen}
          aria-label="Filter projects by status"
          onClick={() => setIsStatusOpen((current) => !current)}
        >
          {selectedStatusLabel}
        </button>

        {isStatusOpen ? (
          <div className="project-status-menu" role="listbox">
            {statusOptions.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                className={`project-status-option ${option.value === status ? "is-active" : ""}`}
                role="option"
                aria-selected={option.value === status}
                onClick={() => updateStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
