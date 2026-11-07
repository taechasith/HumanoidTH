"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, PackageSearch } from "lucide-react";
import type { ContributionMapPoint } from "./actions";
import type { ProvinceBoundary } from "./provinceBoundaries";
import styles from "./LocationExplorer.module.css";

type Props = {
  points: ContributionMapPoint[];
  provinceBoundaries: ProvinceBoundary[];
  lang?: "en" | "th";
};

type LocationGroup = {
  id: string;
  label: string;
  points: ContributionMapPoint[];
  contributionCount: number;
};

const localT = {
  en: {
    title: "Explore by location",
    subtitle: "Choose a place, then see the organisations, robots, and projects recorded there.",
    locations: "Locations",
    organizations: "Organisations",
    records: "Connected records",
    selectOrganization: "What is here?",
    selected: "Selected organisation",
    summary: "Ecosystem summary",
    connectedItems: "Robots, projects, and records",
    empty: "No location data is available yet.",
    mapSearch: "Find a province...",
    noProvinceData: "No Atlas records are connected to this province yet.",
    boundaryUnavailable: "Province boundaries could not be loaded. You can still select a recorded location from the list.",
    boundaryCredit: "Provincial boundaries: Thailand ADM1 open data",
    mapLegendAvailable: "Atlas records available",
    mapLegendSelected: "Selected province",
    mapLegendEmpty: "No records yet",
    coverageTitle: "Atlas coverage",
    coverageBody: "provinces currently have recorded information",
    mapHint: "Start with a green province, or search for any province from the panel on the right."
  },
  th: {
    title: "เลือกดูตามสถานที่",
    subtitle: "เลือกพื้นที่ แล้วดูได้ทันทีว่ามีหน่วยงาน หุ่นยนต์ และผลงานอะไรบ้าง",
    locations: "พื้นที่ข้อมูล",
    organizations: "หน่วยงาน",
    records: "รายการที่เชื่อมโยง",
    selectOrganization: "ที่นี่มีอะไรบ้าง?",
    selected: "หน่วยงานที่เลือก",
    summary: "สรุประบบนิเวศ",
    connectedItems: "หุ่นยนต์ โครงการ และรายการที่เชื่อมโยง",
    empty: "ยังไม่มีข้อมูลสถานที่ในระบบ",
    mapSearch: "ค้นหาจังหวัด...",
    noProvinceData: "ยังไม่มีรายการใน Atlas ที่เชื่อมโยงกับจังหวัดนี้",
    boundaryUnavailable: "ไม่สามารถโหลดขอบเขตจังหวัดได้ แต่ยังเลือกพื้นที่ที่มีข้อมูลจากรายการด้านซ้ายได้",
    boundaryCredit: "ขอบเขตจังหวัด: ข้อมูลเปิดระดับจังหวัดของไทย",
    mapLegendAvailable: "มีข้อมูลใน Atlas",
    mapLegendSelected: "จังหวัดที่เลือก",
    mapLegendEmpty: "ยังไม่มีข้อมูล",
    coverageTitle: "ความครอบคลุมของ Atlas",
    coverageBody: "จังหวัดที่มีข้อมูลบันทึกไว้แล้ว",
    mapHint: "เริ่มจากจังหวัดสีเขียว หรือค้นหาจังหวัดใดก็ได้จากแผงด้านขวา"
  }
};

function locationId(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function groupByLocation(points: ContributionMapPoint[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();
  points.forEach((point) => {
    const label = point.locationLabel || "Unknown location";
    const id = locationId(label);
    const existing = groups.get(id);
    if (existing) {
      existing.points.push(point);
      existing.contributionCount += point.contributionCount;
      return;
    }
    groups.set(id, { id, label, points: [point], contributionCount: point.contributionCount });
  });
  return [...groups.values()].sort((left, right) => right.contributionCount - left.contributionCount || left.label.localeCompare(right.label));
}

const mapBounds = { minLongitude: 97.3, maxLongitude: 105.7, minLatitude: 5.5, maxLatitude: 20.6, width: 540, height: 970 };

function normalisePlace(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-zก-๙]+/gi, "");
}

function provinceForLocation(location: LocationGroup, boundaries: ProvinceBoundary[]) {
  const label = normalisePlace(location.label.split(",")[0] ?? location.label);
  return boundaries.find((province) => {
    const english = normalisePlace(province.nameEn);
    const thai = normalisePlace(province.nameTh);
    return label === english || label === thai || label.includes(english) || label.includes(thai);
  });
}

function pathForRing(ring: Array<[number, number]>) {
  return ring.map(([longitude, latitude], index) => {
    const x = ((longitude - mapBounds.minLongitude) / (mapBounds.maxLongitude - mapBounds.minLongitude)) * mapBounds.width;
    const y = ((mapBounds.maxLatitude - latitude) / (mapBounds.maxLatitude - mapBounds.minLatitude)) * mapBounds.height;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function ThailandProvinceMap({ boundaries, recordsByProvince, selectedProvinceId, onSelect, lang }: {
  boundaries: ProvinceBoundary[];
  recordsByProvince: Map<string, LocationGroup>;
  selectedProvinceId: string | null;
  onSelect: (province: ProvinceBoundary) => void;
  lang: "en" | "th";
}) {
  return (
    <div className={styles.mapCanvas} aria-label={lang === "th" ? "แผนที่จังหวัดประเทศไทย เลือกจังหวัดเพื่อดูข้อมูล" : "Thailand province map. Select a province to inspect its records."}>
      <svg className={styles.provinceMap} viewBox={`0 0 ${mapBounds.width} ${mapBounds.height}`} role="img">
        {boundaries.map((province) => {
          const location = recordsByProvince.get(province.id);
          const selected = selectedProvinceId === province.id;
          const label = lang === "th" && province.nameTh ? province.nameTh : province.nameEn;
          return (
            <g
              aria-label={`${label}${location ? `: ${location.contributionCount} ${lang === "th" ? "รายการที่เชื่อมโยง" : "connected records"}` : `: ${lang === "th" ? "ยังไม่มีข้อมูล" : "no records"}`}`}
              aria-pressed={selected}
              className={`${styles.province} ${location ? styles.hasData : ""} ${selected ? styles.selectedProvince : ""}`}
              key={province.id}
              onClick={() => onSelect(province)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(province);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <title>{label}</title>
              {province.rings.map((ring, index) => <path d={pathForRing(ring)} key={`${province.id}-${index}`} />)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function LocationExplorer({ points, provinceBoundaries, lang = "en" }: Props) {
  const t = localT[lang];
  const locations = useMemo(() => groupByLocation(points), [points]);
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id ?? "");
  const [selectedPointId, setSelectedPointId] = useState(locations[0]?.points[0]?.id ?? "");
  const recordsByProvince = useMemo(() => {
    const records = new Map<string, LocationGroup>();
    locations.forEach((location) => {
      const province = provinceForLocation(location, provinceBoundaries);
      if (province) records.set(province.id, location);
    });
    return records;
  }, [locations, provinceBoundaries]);
  const [selectedProvinceId, setSelectedProvinceId] = useState(() => locations[0] ? provinceForLocation(locations[0], provinceBoundaries)?.id ?? null : null);
  const [provinceSearch, setProvinceSearch] = useState("");
  const selectedLocation = selectedProvinceId ? recordsByProvince.get(selectedProvinceId) ?? null : locations.find((location) => location.id === selectedLocationId) ?? null;
  const selectedPoint = selectedLocation?.points.find((point) => point.id === selectedPointId) ?? selectedLocation?.points[0];
  const selectedProvince = provinceBoundaries.find((province) => province.id === selectedProvinceId) ?? null;
  const matchedProvinces = useMemo(() => {
    const query = normalisePlace(provinceSearch);
    if (!query) return [];
    return provinceBoundaries.filter((province) => (
      normalisePlace(province.nameEn).includes(query) || normalisePlace(province.nameTh).includes(query)
    )).slice(0, 6);
  }, [provinceBoundaries, provinceSearch]);

  useEffect(() => {
    if (selectedLocation && !selectedLocation.points.some((point) => point.id === selectedPointId)) {
      setSelectedPointId(selectedLocation.points[0]?.id ?? "");
    }
  }, [selectedLocation, selectedPointId]);

  const selectLocation = (location: LocationGroup) => {
    setSelectedLocationId(location.id);
    setSelectedPointId(location.points[0]?.id ?? "");
    setSelectedProvinceId(provinceForLocation(location, provinceBoundaries)?.id ?? null);
  };

  const selectProvince = (province: ProvinceBoundary) => {
    const location = recordsByProvince.get(province.id);
    setSelectedProvinceId(province.id);
    if (location) {
      setSelectedLocationId(location.id);
      setSelectedPointId(location.points[0]?.id ?? "");
    }
  };

  if (!locations.length) {
    return <div className={`panel ${styles.empty}`}>{t.empty}</div>;
  }

  return (
    <section className={styles.explorer} aria-label={t.title}>
      <aside className={`panel ${styles.locationPanel}`}>
        <div className={styles.panelHeader}>
          <span className={styles.eyebrow}>{t.locations}</span>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <div className={styles.locationList}>
          {locations.map((location) => {
            const selected = location.id === selectedLocation?.id;
            return (
              <button
              aria-pressed={selected}
              className={`${styles.locationButton} ${selected ? styles.selected : ""}`}
              key={location.id}
                onClick={() => selectLocation(location)}
                type="button"
              >
                <MapPin aria-hidden="true" size={16} />
                <span className={styles.locationName}>{location.label}</span>
                <span className={styles.locationStats}>{location.points.length} {t.organizations} · {location.contributionCount} {t.records}</span>
              </button>
            );
          })}
        </div>
        <label className={styles.provinceSearch}>
          <span>{lang === "th" ? "ค้นหาจังหวัด" : "Find a province"}</span>
          <input onChange={(event) => setProvinceSearch(event.target.value)} placeholder={t.mapSearch} value={provinceSearch} />
        </label>
        {matchedProvinces.length > 0 && (
          <div className={styles.provinceMatches}>
            {matchedProvinces.map((province) => (
              <button key={province.id} onClick={() => selectProvince(province)} type="button">
                {lang === "th" && province.nameTh ? province.nameTh : province.nameEn}
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className={`panel ${styles.tileMapPanel}`} aria-label={t.title}>
        <div className={styles.sectionTitle}>
          <span className={styles.eyebrow}>{lang === "th" ? "แผนที่ข้อมูล" : "Data map"}</span>
          <h2>{lang === "th" ? "เลือกพื้นที่บนแผนที่" : "Select a location on the map"}</h2>
          <p>{lang === "th" ? "สีเขียวคือจังหวัดที่มีข้อมูลใน Atlas กดเลือกจังหวัดใดก็ได้เพื่อดูรายละเอียด" : "Green provinces have Atlas records. Select any province to inspect its details."}</p>
        </div>
        <div className={styles.mapWorkspace}>
          {provinceBoundaries.length > 0 ? (
            <ThailandProvinceMap
              boundaries={provinceBoundaries}
              lang={lang}
              onSelect={selectProvince}
              recordsByProvince={recordsByProvince}
              selectedProvinceId={selectedProvinceId}
            />
          ) : <p className={styles.boundaryUnavailable}>{t.boundaryUnavailable}</p>}
          <div className={styles.mapGuide}>
            <div className={styles.coverageCard}>
              <span>{t.coverageTitle}</span>
              <strong>{recordsByProvince.size}<small> / {provinceBoundaries.length || 77}</small></strong>
              <p>{t.coverageBody}</p>
            </div>
            <div className={styles.legend} aria-label={lang === "th" ? "คำอธิบายสีแผนที่" : "Map colour legend"}>
              <span><i className={styles.legendAvailable} aria-hidden="true" />{t.mapLegendAvailable}</span>
              <span><i className={styles.legendSelected} aria-hidden="true" />{t.mapLegendSelected}</span>
              <span><i className={styles.legendEmpty} aria-hidden="true" />{t.mapLegendEmpty}</span>
            </div>
            <p className={styles.mapHint}>{t.mapHint}</p>
          </div>
        </div>
        <p className={styles.boundaryCredit}>{t.boundaryCredit}</p>
      </section>

      <aside className={`panel ${styles.detailPanel}`} aria-label={t.selected}>
        {selectedPoint && selectedLocation ? (
          <>
            <div className={styles.detailHeading}>
              <span className={styles.eyebrow}>{t.selected}</span>
              <h2>{selectedPoint.title}</h2>
              <p><MapPin aria-hidden="true" size={14} /> {selectedPoint.locationLabel}</p>
            </div>
            <div className={styles.organizationList}>
              {selectedLocation?.points.map((point) => {
                const selected = point.id === selectedPoint?.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={`${styles.organizationButton} ${selected ? styles.selected : ""}`}
                    key={point.id}
                    onClick={() => setSelectedPointId(point.id)}
                    type="button"
                  >
                    <Building2 aria-hidden="true" size={18} />
                    <span>
                      <strong>{point.title}</strong>
                      <small>{point.contributorType} · {point.contributionCount} {t.records}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={styles.detailBlock}>
              <strong>{t.summary}</strong>
              <p>{selectedPoint.summary}</p>
            </div>
            <div className={styles.detailBlock}>
              <strong>{t.connectedItems} ({selectedPoint.contributionCount})</strong>
              <ul>
                {selectedPoint.detailsList.map((item) => <li key={item}><PackageSearch aria-hidden="true" size={14} /> {item}</li>)}
              </ul>
            </div>
          </>
        ) : selectedProvince ? (
          <div className={styles.noProvinceData}>
            <span className={styles.eyebrow}>{lang === "th" ? "จังหวัดที่เลือก" : "Selected province"}</span>
            <h2>{lang === "th" && selectedProvince.nameTh ? selectedProvince.nameTh : selectedProvince.nameEn}</h2>
            <p>{t.noProvinceData}</p>
          </div>
        ) : <div className={styles.empty}>{t.empty}</div>}
      </aside>
    </section>
  );
}
