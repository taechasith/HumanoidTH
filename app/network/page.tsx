import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import NetworkGraphClient from "./NetworkGraphClient";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";

  const [triplets, robots, inventory, contributions] = await Promise.all([
    prisma.triplet.findMany({ include: { source: true }, orderBy: { confidence: "desc" }, take: 500 }),
    prisma.robotModel.findMany(),
    prisma.ownedInventory.findMany({ include: { robotModel: true } }),
    prisma.contribution.findMany()
  ]);

  const serializedTriplets = JSON.parse(JSON.stringify(triplets));
  const serializedRobots = JSON.parse(JSON.stringify(robots));
  const serializedInventory = JSON.parse(JSON.stringify(inventory));
  const serializedContributions = JSON.parse(JSON.stringify(contributions));

  return (
    <NetworkGraphClient 
      triplets={serializedTriplets} 
      robots={serializedRobots} 
      inventory={serializedInventory} 
      contributions={serializedContributions} 
      currentLang={lang}
    />
  );
}
