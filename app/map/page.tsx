import { cookies } from "next/headers";
import { Globe2, Radar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hostnameFromUrl } from "@/lib/geo";
import { sourceToMapPoint } from "@/lib/map-points";
import { getTranslation } from "@/lib/translations";
import GoogleMapClient from "./GoogleMapClient";
import { backfillSourceIpGeolocation } from "./actions";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const [totalSourceCount, sources] = await Promise.all([
    prisma.sourceRecord.count(),
    prisma.sourceRecord.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        url: true,
        platform: true,
        sourceType: true,
        rawMeta: true,
        publishedAt: true
      }
    })
  ]);

  const points = sources.map(sourceToMapPoint).filter((point): point is NonNullable<typeof point> => Boolean(point));
  const mappedIds = new Set(points.map((point) => point.id));
  const unmappedSources = sources.filter((source) => !mappedIds.has(source.id));
  const unmapped = totalSourceCount - points.length;
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
          <p className="muted" style={{ margin: 0 }}>Real source records</p>
          <div className="stat">{totalSourceCount}</div>
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
        This page uses only database source records. It does not create mock map points. Existing records may need real DNS/IP geolocation backfill before markers appear.
      </div>

      <form action={backfillSourceIpGeolocation} className="toolbar" style={{ marginTop: 0 }}>
        <button className="primary" type="submit">
          <Radar size={16} aria-hidden="true" />
          Backfill real IP geolocation
        </button>
        <span className="muted">Processes up to 40 existing source records per click.</span>
      </form>

      <GoogleMapClient apiKey={apiKey} points={points} />

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
            {!points.length ? (
              <tr>
                <td colSpan={5} className="empty">
                  <Globe2 size={22} aria-hidden="true" /> No source records have resolved IP coordinates yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Unmapped real source</th>
              <th>Platform</th>
              <th>Host</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {unmappedSources.slice(0, 100).map((source) => (
              <tr key={source.id}>
                <td>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                  <br />
                  <span className="muted">{source.sourceType}</span>
                </td>
                <td>{source.platform ?? "unknown"}</td>
                <td>{hostnameFromUrl(source.url) ?? "invalid url"}</td>
                <td>Needs real IP geolocation</td>
              </tr>
            ))}
            {!unmappedSources.length ? (
              <tr>
                <td colSpan={4} className="empty">All source records currently loaded on this page are mapped.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
