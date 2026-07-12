"use client";

import { useEffect, useRef, useState } from "react";
import type { AssetUrls, SdkConfig } from "@/lib/utils";

type ModelViewerElement = HTMLElement & {
  src: string;
  iosSrc?: string;
  autoRotate?: boolean;
  cameraOrbit?: string;
  shadowIntensity?: number;
  scale?: string;
};

type ModelViewerProps = React.DetailedHTMLProps<React.HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
  src: string;
  "ios-src"?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "camera-controls"?: boolean;
  "touch-action"?: string;
  "auto-rotate"?: boolean;
  "shadow-intensity"?: string;
  "camera-orbit"?: string;
  scale?: string;
  exposure?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerProps;
    }
  }
}

interface EmbedViewerProps {
  projectId: string;
  name: string;
  assetUrls: AssetUrls;
  sdkConfig: SdkConfig;
}

export default function EmbedViewer({ projectId, name, assetUrls, sdkConfig }: EmbedViewerProps) {
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const sendEvent = (eventType: "VIEW" | "INTERACTION" | "AR_LAUNCH") => {
      void fetch("/api/sdk/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, sessionId, projectId }),
        keepalive: true,
      }).catch(() => undefined);
    };

    sendEvent("VIEW");

    const viewer = viewerRef.current;
    if (!viewer) return;

    let interactionSent = false;
    let arLaunchSent = false;

    const handleCameraChange = () => {
      if (interactionSent) return;
      interactionSent = true;
      sendEvent("INTERACTION");
    };

    const handleArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status;
      if (arLaunchSent || status !== "session-started") return;
      arLaunchSent = true;
      sendEvent("AR_LAUNCH");
    };

    viewer.addEventListener("camera-change", handleCameraChange);
    viewer.addEventListener("ar-status", handleArStatus);

    return () => {
      viewer.removeEventListener("camera-change", handleCameraChange);
      viewer.removeEventListener("ar-status", handleArStatus);
    };
  }, [projectId, sessionId]);

  const autoRotate = sdkConfig.autoRotate ?? true;
  const shadow = sdkConfig.shadow ?? 0.8;
  const scale = sdkConfig.scale?.join(" ") ?? "1 1 1";

  return (
    <model-viewer
      ref={viewerRef}
      src={assetUrls.glb}
      ios-src={assetUrls.usdz}
      ar={Boolean(assetUrls.usdz)}
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      touch-action="pan-y"
      auto-rotate={autoRotate}
      shadow-intensity={String(shadow)}
      camera-orbit={sdkConfig.cameraOrbit ?? "45deg 55deg 1.5m"}
      scale={scale}
      exposure="1"
      aria-label={`Interactive 3D model for ${name}`}
      style={{ width: "100%", height: "100%", minHeight: 360 }}
    />
  );
}
