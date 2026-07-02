import { prisma } from "@/lib/prisma";
import NetworkGraphClient from "./NetworkGraphClient";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  let triplets = [];
  let robots = [];
  let inventory = [];
  let contributions = [];
  let dbOffline = false;

  try {
    [triplets, robots, inventory, contributions] = await Promise.all([
      prisma.triplet.findMany({ include: { source: true }, orderBy: { confidence: "desc" }, take: 500 }),
      prisma.robotModel.findMany(),
      prisma.ownedInventory.findMany({ include: { robotModel: true } }),
      prisma.contribution.findMany()
    ]);
  } catch (error) {
    console.error("Database connection failed in network graph page:", error);
    dbOffline = true;
    // Representative fallback entities for the Cytoscape graph preview.
    robots = [
      { id: "1", canonicalName: "Dinsaw Mini", manufacturer: "CT Asia Robotics" },
      { id: "2", canonicalName: "NAO", manufacturer: "SoftBank Robotics" }
    ];
    inventory = [
      { id: "mock-inv-1", displayName: "NAO Education Platform B", robotModelId: "2", robotModel: { canonicalName: "NAO" } },
      { id: "mock-inv-2", displayName: "Dinsaw Eldercare Unit A", robotModelId: "1", robotModel: { canonicalName: "Dinsaw Mini" } }
    ];
    contributions = [
      { id: "mock-contrib-1", title: "Thai HRI research seed", authorName: "FIBO KMUTT", contributionType: "code_repository" }
    ];
    triplets = [
      { id: "t1", subject: "Dinsaw Mini", relation: "instance_of", object: "robot_model", confidence: 0.95 },
      { id: "t2", subject: "NAO", relation: "instance_of", object: "robot_model", confidence: 0.98 },
      { id: "t3", subject: "NAO Education Platform B", relation: "uses", object: "NAO", confidence: 0.90 },
      { id: "t4", subject: "Dinsaw Eldercare Unit A", relation: "uses", object: "Dinsaw Mini", confidence: 0.88 },
      { id: "t5", subject: "FIBO KMUTT", relation: "contributed_to", object: "Thai HRI research seed", confidence: 0.92 },
      { id: "t6", subject: "Thai HRI research seed", relation: "uses", object: "NAO", confidence: 0.85 }
    ];
  }

  // Clean JSON serialization for Next.js Server Components
  const serializedTriplets = JSON.parse(JSON.stringify(triplets));
  const serializedRobots = JSON.parse(JSON.stringify(robots));
  const serializedInventory = JSON.parse(JSON.stringify(inventory));
  const serializedContributions = JSON.parse(JSON.stringify(contributions));

  return (
    <>
      {dbOffline && (
        <div className="notice" style={{ backgroundColor: "#fffbeb", borderLeftColor: "var(--warning)", marginBottom: "16px", margin: "14px 22px" }}>
          <strong>Database Offline:</strong> Live PostgreSQL is unavailable. Showing a sample relationship graph for layout preview.
        </div>
      )}
      <NetworkGraphClient 
        triplets={serializedTriplets} 
        robots={serializedRobots} 
        inventory={serializedInventory} 
        contributions={serializedContributions} 
      />
    </>
  );
}
