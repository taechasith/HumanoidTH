import { cookies } from "next/headers";
import { Globe2, MapPinned } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sourceToMapPoint } from "@/lib/map-points";
import { getTranslation } from "@/lib/translations";
import GoogleMapClient from "./GoogleMapClient";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const sources = await prisma.sourceRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      title: true,
      url: true,
      platform: true,
      sourceType: true,
      rawMeta: true,
      publishedAt: true
    }
  });

  const points = sources.map(sourceToMapPoint).filter((point): point is NonNullable<typeof point> => Boolean(point));
  const unmapped = sources.length - points.length;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.mapTitle}</h1>
          <p className="muted">{t.mapDesc}</p>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="panel motion-panel">
          <p className="muted" style={{ margin: 0 }}>Mapped source IPs</p>
          <div className="stat">{points.length}</div>
        </div>
        <div className="panel motion-panel">
          <p className="muted" style={{ margin: 0 }}>Recent source records</p>
          <div className="stat">{sources.length}</div>
        </div>
        <div className="panel motion-panel">
          <p className="muted" style={{ margin: 0 }}>Unmapped records</p>
          <div className="stat">{unmapped}</div>
        </div>
        <div className="panel motion-panel">
          <p className="muted" style={{ margin: 0 }}>Map provider</p>
          <div className="stat" style={{ fontSize: 18 }}>Google Maps</div>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 12 }}>
        New data pulls store source host, resolved IP address, and IP geolocation in <code>rawMeta.networkGeo</code>.
        IP location is approximate and depends on DNS plus the public IP geolocation lookup succeeding.
      </div>

      {points.length ? (
        <GoogleMapClient apiKey={apiKey} points={points} />
      ) : (
        <div className="panel" style={{ minHeight: 420, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <MapPinned size={36} aria-hidden="true" />
            <h2 style={{ marginTop: 10 }}>No geolocated source IPs yet</h2>
            <p className="muted" style={{ maxWidth: 560 }}>
              Run a new pull from Data Pulls so incoming records can be enriched with host IP geolocation.
              Existing records without <code>rawMeta.networkGeo</code> will appear in the unmapped list below.
            </p>
          </div>
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Platform</th>
              <th>Host</th>
              <th>IP address</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.id}>
                <td>
                  <a href={point.url} target="_blank" rel="noreferrer">{point.title}</a>
                  <br />
                  <span className="muted">{point.sourceType}</span>
                </td>
                <td>{point.platform}</td>
                <td>{point.host}</td>
                <td>{point.ipAddress}</td>
                <td>{point.locationLabel}</td>
              </tr>
            ))}
            {!points.length && (
              <tr>
                <td colSpan={5} className="empty">
                  <Globe2 size={22} aria-hidden="true" /> No mapped source rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
