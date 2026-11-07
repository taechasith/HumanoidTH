export type ProvinceBoundary = {
  id: string;
  nameEn: string;
  nameTh: string;
  rings: Array<Array<[number, number]>>;
};

const provinceBoundarySource = "https://raw.githubusercontent.com/DevelopedbyWill/thailand-canonical-admin-names/main/data/v1.0.0/thailand-adm1-polygons-v1.0.0.geojson";

function toRing(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((coordinate) => (
    Array.isArray(coordinate) && typeof coordinate[0] === "number" && typeof coordinate[1] === "number"
      ? [[coordinate[0], coordinate[1]] as [number, number]]
      : []
  ));
}

function toRings(geometry: unknown): Array<Array<[number, number]>> {
  if (!geometry || typeof geometry !== "object") return [];
  const value = geometry as { type?: string; coordinates?: unknown };
  if (value.type === "Polygon" && Array.isArray(value.coordinates)) {
    return value.coordinates.map(toRing).filter((ring) => ring.length > 2);
  }
  if (value.type === "MultiPolygon" && Array.isArray(value.coordinates)) {
    return value.coordinates.flatMap((polygon) => (
      Array.isArray(polygon) ? polygon.map(toRing).filter((ring) => ring.length > 2) : []
    ));
  }
  return [];
}

// A small, cached public boundary dataset is used only to draw provincial
// shapes. It does not require a map provider key or transmit Atlas data.
export async function fetchThailandProvinceBoundaries(): Promise<ProvinceBoundary[]> {
  try {
    const response = await fetch(provinceBoundarySource, { next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!response.ok) return [];
    const data = await response.json() as { features?: Array<{ properties?: Record<string, unknown>; geometry?: unknown }> };
    return (data.features ?? []).flatMap((feature) => {
      const properties = feature.properties ?? {};
      const rings = toRings(feature.geometry);
      const nameEn = String(properties.ADM1_EN ?? "");
      const nameTh = String(properties.ADM1_TH ?? "");
      const id = String(properties.ADM1_PCODE ?? nameEn);
      return id && nameEn && rings.length ? [{ id, nameEn, nameTh, rings }] : [];
    });
  } catch {
    return [];
  }
}
