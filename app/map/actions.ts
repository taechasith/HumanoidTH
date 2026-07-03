"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "../../generated/prisma";
import { prisma } from "@/lib/prisma";
import { enrichRawMetaWithNetworkGeo } from "@/lib/geo";

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function hasResolvedGeo(rawMeta: Prisma.JsonValue) {
  const meta = jsonObject(rawMeta);
  const networkGeo = jsonObject(meta.networkGeo as Prisma.JsonValue);
  const geo = jsonObject(networkGeo.geo as Prisma.JsonValue);
  return typeof geo.latitude === "number" && typeof geo.longitude === "number";
}

export async function backfillSourceIpGeolocation() {
  const sources = await prisma.sourceRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      url: true,
      rawMeta: true
    }
  });

  for (const source of sources) {
    if (hasResolvedGeo(source.rawMeta)) continue;

    const rawMeta = jsonObject(source.rawMeta);
    const enriched = await enrichRawMetaWithNetworkGeo(source.url, rawMeta);

    await prisma.sourceRecord.update({
      where: { id: source.id },
      data: { rawMeta: enriched as Prisma.InputJsonValue }
    });
  }

  revalidatePath("/map");
}
