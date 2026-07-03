"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import type { SourceMapPoint } from "@/lib/map-points";

declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  apiKey: string;
  points: SourceMapPoint[];
};

function centerFor(points: SourceMapPoint[]) {
  if (!points.length) return { lat: 13.7563, lng: 100.5018 };
  return {
    lat: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.longitude, 0) / points.length
  };
}

export default function GoogleMapClient({ apiKey, points }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [activePoint, setActivePoint] = useState<SourceMapPoint | null>(points[0] ?? null);
  const mapCenter = useMemo(() => centerFor(points), [points]);

  useEffect(() => {
    if (!scriptReady || !mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: points.length > 1 ? 3 : 8,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    const bounds = new window.google.maps.LatLngBounds();
    const infoWindow = new window.google.maps.InfoWindow();

    points.forEach((point) => {
      const position = { lat: point.latitude, lng: point.longitude };
      bounds.extend(position);

      const marker = new window.google.maps.Marker({
        map,
        position,
        title: point.title
      });

      marker.addListener("click", () => {
        setActivePoint(point);
        infoWindow.setContent(`
          <div style="max-width:260px">
            <strong>${point.title.replace(/[<>&"]/g, "")}</strong>
            <div>${point.host} / ${point.ipAddress}</div>
            <div>${point.locationLabel}</div>
          </div>
        `);
        infoWindow.open({ anchor: marker, map });
      });
    });

    if (points.length > 1) {
      map.fitBounds(bounds, 48);
    }
  }, [mapCenter, points, scriptReady]);

  if (!apiKey) {
    return (
      <div className="panel" style={{ minHeight: 420, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <MapPin size={34} aria-hidden="true" />
          <h2 style={{ marginTop: 10 }}>Google Maps API key required</h2>
          <p className="muted" style={{ maxWidth: 520 }}>
            Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to the environment to render the live Google Map.
            Stored IP geolocation points are still listed below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="map-layout">
        <div ref={mapRef} className="panel" style={{ minHeight: 520, padding: 0, overflow: "hidden" }} />
        <aside className="panel" style={{ minHeight: 520 }}>
          <h2>Selected source</h2>
          {activePoint ? (
            <div style={{ display: "grid", gap: 10 }}>
              <strong>{activePoint.title}</strong>
              <span className="badge">{activePoint.platform}</span>
              <div className="muted">{activePoint.locationLabel}</div>
              <div><strong>Host:</strong> {activePoint.host}</div>
              <div><strong>IP:</strong> {activePoint.ipAddress}</div>
              <a className="button" href={activePoint.url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden="true" />
                Open source
              </a>
            </div>
          ) : (
            <div className="empty">No mapped source selected.</div>
          )}
        </aside>
      </div>
    </>
  );
}
