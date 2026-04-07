"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type StationMarker = {
  stationId: string;
  latitude: number;
  longitude: number;
};

type LeafletMap = {
  setView: (coords: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: [number, number][], options?: { padding?: [number, number]; maxZoom?: number }) => void;
  flyTo: (coords: [number, number], zoom: number, options?: { duration?: number; easeLinearity?: number }) => void;
  once: (eventName: string, callback: () => void) => void;
  remove: () => void;
};

type LeafletLayerGroup = {
  clearLayers: () => void;
};

type LeafletApi = {
  map: (container: HTMLDivElement, options: { zoomControl: boolean; worldCopyJump: boolean }) => LeafletMap;
  tileLayer: (url: string, options: { maxZoom: number; attribution: string }) => { addTo: (map: LeafletMap) => void };
  layerGroup: () => { addTo: (map: LeafletMap) => LeafletLayerGroup };
  marker: (coords: [number, number]) => {
    addTo: (layer: LeafletLayerGroup) => { bindPopup: (content: string) => void };
  };
};

declare global {
  interface Window {
    L?: LeafletApi;
  }
}

type StationMapProps = {
  markers: StationMarker[];
  className?: string;
  shouldFlyToFirstMarker?: boolean;
};

const DEFAULT_VIEW: [number, number] = [18, 0];

export function StationMap({ markers, className, shouldFlyToFirstMarker = false }: StationMapProps) {
  const [isFlying, setIsFlying] = useState(shouldFlyToFirstMarker);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerGroupRef = useRef<LeafletLayerGroup | null>(null);

  const fallbackMarker = useMemo<StationMarker | null>(() => markers[0] ?? null, [markers]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupMap = async () => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!window.L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Leaflet"));
          document.body.appendChild(script);
        });
      }

      const leaflet = window.L;
      if (!leaflet || !mapContainerRef.current) {
        return;
      }

      const map = leaflet.map(mapContainerRef.current, { zoomControl: true, worldCopyJump: true }).setView(DEFAULT_VIEW, 2);

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);

      layerGroupRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;

      if (shouldFlyToFirstMarker && fallbackMarker) {
        const flyTimer = window.setTimeout(() => {
          map.flyTo([fallbackMarker.latitude, fallbackMarker.longitude], 11, { duration: 2.8, easeLinearity: 0.25 });
        }, 800);

        map.once("moveend", () => {
          setIsFlying(false);
        });

        cleanup = () => {
          window.clearTimeout(flyTimer);
          map.remove();
          mapRef.current = null;
        };

        return;
      }

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    };

    setupMap().catch(() => {
      setIsFlying(false);
    });

    return () => {
      cleanup?.();
    };
  }, [fallbackMarker, shouldFlyToFirstMarker]);

  useEffect(() => {
    const leaflet = window.L;

    if (!leaflet || !mapRef.current || !layerGroupRef.current) {
      return;
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    if (!markers.length) {
      map.setView(DEFAULT_VIEW, 2);
      return;
    }

    const bounds: [number, number][] = [];

    for (const marker of markers) {
      const markerInstance = leaflet.marker([marker.latitude, marker.longitude]).addTo(layerGroup);
      markerInstance.bindPopup(`${marker.stationId}`);
      bounds.push([marker.latitude, marker.longitude]);
    }

    if (shouldFlyToFirstMarker && markers.length === 1) {
      return;
    }

    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 11 });
  }, [markers, shouldFlyToFirstMarker]);

  return (
    <>
      <div
        ref={mapContainerRef}
        className={`${className ?? "h-full w-full"} [filter:invert(1)_hue-rotate(180deg)_brightness(0.55)_contrast(1.1)_saturate(0.75)]`}
      />
      {isFlying ? (
        <div className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full border border-zinc-700/80 bg-black/55 px-4 py-2 text-xs tracking-[0.18em] text-zinc-200">
          Flying to Station...
        </div>
      ) : null}
    </>
  );
}
