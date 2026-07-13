"use client";

import { useState } from "react";

export function ProjectCardMedia({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`project-card-media ${!src || failed ? "is-empty" : ""}`}>
      {src && !failed ? (
        // Signed storage URLs are created when the project list is requested.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : null}
    </div>
  );
}
