import { loadEnvFile } from "node:process";

loadEnvFile(".env");

const { PrismaClient } = await import("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "creativelab.co.th@gmail.com" },
    update: { name: "CreativeLabTH Group", role: "ADMIN" },
    create: { email: "creativelab.co.th@gmail.com", name: "CreativeLabTH Group", role: "ADMIN" }
  });

  const dinsaw = await prisma.robotModel.upsert({
    where: { canonicalName: "Dinsaw Robot" },
    update: {},
    create: {
      canonicalName: "Dinsaw Robot",
      manufacturer: "CT Asia Robotics",
      developerOrg: "CT Asia Robotics",
      countryOfOrigin: "Thailand",
      robotType: "eldercare_robot",
      embodimentLevel: "mobile_base_with_screen",
      primaryUseCase: "eldercare and hospital assistance",
      thailandStatus: "developed_in_thailand",
      statusConfidence: 0.7,
      description: "Thai eldercare and service robot seed record requiring source verification."
    }
  });

  await prisma.robotModel.upsert({
    where: { canonicalName: "NAO" },
    update: {},
    create: {
      canonicalName: "NAO",
      manufacturer: "SoftBank Robotics",
      countryOfOrigin: "France",
      robotType: "humanoid_full_body",
      embodimentLevel: "full_body_humanoid",
      primaryUseCase: "education and HRI research",
      thailandStatus: "observed_in_thailand",
      statusConfidence: 0.45,
      description: "Imported humanoid platform often used in education and research; Thailand-specific usage requires record evidence."
    }
  });

  await prisma.contribution.upsert({
    where: { sourceUrl: "seed:contribution:thai-hri-research" },
    update: {},
    create: {
      title: "Thai HRI research seed",
      contributionType: "research_paper",
      contributorType: "research_group",
      organization: "Thai university lab",
      description: "Placeholder contribution for Thai human-robot interaction research.",
      sourceUrl: "seed:contribution:thai-hri-research",
      relatedRobotModelId: dinsaw.id,
      verificationStatus: "NEEDS_REVIEW"
    }
  });

  const seedSources = [
    ["Dinsaw robot in Thailand eldercare media seed", "seed:source:dinsaw-eldercare-media", "Dinsaw robot Thailand hospital eldercare service robot public media discussion seed."],
    ["Bangkok humanoid robot exhibition seed", "seed:source:bangkok-humanoid-exhibition", "Bangkok exhibition humanoid robot demo entertainment novelty and national innovation seed."],
    ["Robot job displacement discussion in Thailand seed", "seed:source:robot-job-displacement-thailand", "Public media discussion about robot automation replace jobs in Thailand service sector with cautious support."]
  ] as const;

  let firstSourceId: string | undefined;

  for (const [title, url, excerpt] of seedSources) {
    const source = await prisma.sourceRecord.upsert({
      where: { url },
      update: {},
      create: {
        sourceType: "SEED",
        title,
        url,
        excerpt,
        platform: "curated_seed",
        relevanceStatus: "ACCEPTED",
        relevanceReason: "Seeded Thailand robotics record.",
        relevanceConfidence: 0.8
      }
    });

    firstSourceId ??= source.id;
  }

  if (firstSourceId) {
    await prisma.perspectiveAnnotation.upsert({
      where: {
        sourceId_perspectiveTheme_targetEntity_evidenceExcerpt: {
          sourceId: firstSourceId,
          perspectiveTheme: "healthcare_and_eldercare_trust",
          targetEntity: "humanoid/social robots in Thailand",
          evidenceExcerpt: "Seed evidence excerpt for the first public/media signal."
        }
      },
      update: {},
      create: {
        sourceId: firstSourceId,
        perspectiveTheme: "healthcare_and_eldercare_trust",
        stance: "cautious_supportive",
        sentiment: "mixed",
        targetEntity: "humanoid/social robots in Thailand",
        evidenceExcerpt: "Seed evidence excerpt for the first public/media signal.",
        confidence: 0.72,
        method: "seed"
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
