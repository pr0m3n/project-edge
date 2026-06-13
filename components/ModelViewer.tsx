"use client";

import * as React from "react";
import { useEffect } from "react";

type ModelViewerProps = {
  alt: string;
  className?: string;
  exposure?: string;
  src: string;
};

export function ModelViewer({ alt, className, exposure = "1", src }: ModelViewerProps) {
  useEffect(() => {
    import("@google/model-viewer");
  }, []);

  return (
    <div className={className}>
      {/*
        model-viewer is registered by the client-side import above.
        React.createElement keeps TypeScript happy without global JSX augmentation.
      */}
      {React.createElement("model-viewer", {
        alt,
        src,
        "auto-rotate": true,
        "auto-rotate-delay": "0",
        "rotation-per-second": "18deg",
        "camera-controls": true,
        "disable-zoom": true,
        "interaction-prompt": "none",
        exposure,
        loading: "eager",
        reveal: "auto"
      })}
    </div>
  );
}
