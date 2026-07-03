import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import LocalGraphPathsClient from "./LocalGraphPathsClient";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";

  const [sources, robots, contributions, inventory, triplets, counts] = await Promise.all([
    prisma.sourceRecord.findMany({
      select: {
        id: true,
        title: true,
        url: true,
        sourceType: true,
        platform: true,
        excerpt: true,
        publishedAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 250
    }),
    prisma.robotModel.findMany({
      select: {
        id: true,
        canonicalName: true,
        robotType: true,
        manufacturer: true,
        primaryUseCase: true,
        description: true
      },
      orderBy: { updatedAt: "desc" },
      take: 250
    }),
    prisma.contribution.findMany({
      select: {
        id: true,
        title: true,
        contributionType: true,
        organization: true,
        contributorName: true,
        description: true,
        relatedRobotModelId: true
      },
      orderBy: { updatedAt: "desc" },
      take: 250
    }),
    prisma.ownedInventory.findMany({
      select: {
        id: true,
        displayName: true,
        ownershipStatus: true,
        ownerOrg: true,
        locationLabel: true,
        notes: true,
        robotModelId: true
      },
      orderBy: { updatedAt: "desc" },
      take: 250
    }),
    prisma.triplet.findMany({
      select: {
        id: true,
        subject: true,
        relation: true,
        object: true,
        confidence: true,
        sourceId: true
      },
      orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
      take: 500
    }),
    Promise.all([
      prisma.sourceRecord.count(),
      prisma.robotModel.count(),
      prisma.contribution.count(),
      prisma.ownedInventory.count(),
      prisma.triplet.count()
    ])
  ]);

  const [sourceCount, robotCount, contributionCount, inventoryCount, tripletCount] = counts;

  return (
    <LocalGraphPathsClient
      currentLang={lang}
      sources={JSON.parse(JSON.stringify(sources))}
      robots={JSON.parse(JSON.stringify(robots))}
      contributions={JSON.parse(JSON.stringify(contributions))}
      inventory={JSON.parse(JSON.stringify(inventory))}
      triplets={JSON.parse(JSON.stringify(triplets))}
      counts={{
        sources: sourceCount,
        robots: robotCount,
        contributions: contributionCount,
        inventory: inventoryCount,
        triplets: tripletCount
      }}
    />
  );
}
