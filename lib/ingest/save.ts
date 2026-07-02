import type { NormalizedSource } from "@/lib/ingest/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { classifyRelevance, extractPerspective, classifyWithGemini } from "@/lib/classifiers";

export async function saveSources(records: NormalizedSource[]) {
  let saved = 0;

  for (const record of records) {
    let relevance: {
      relevanceStatus: "ACCEPTED" | "REJECTED" | "UNCERTAIN";
      relevanceReason: string;
      relevanceConfidence: number;
    };
    
    let annotation: {
      stance: string;
      sentiment: string;
      perspectiveTheme: string;
      targetEntity: string;
      evidenceExcerpt: string;
      confidence: number;
      method: string;
    } | null = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiResult = await classifyWithGemini(record.title, record.excerpt ?? "");
        relevance = {
          relevanceStatus: geminiResult.isRelevant ? "ACCEPTED" : "REJECTED",
          relevanceReason: geminiResult.relevanceReason,
          relevanceConfidence: geminiResult.relevanceConfidence
        };
        if (geminiResult.isRelevant) {
          annotation = {
            stance: geminiResult.stance,
            sentiment: geminiResult.sentiment,
            perspectiveTheme: geminiResult.theme,
            targetEntity: geminiResult.targetEntity,
            evidenceExcerpt: geminiResult.evidenceExcerpt,
            confidence: geminiResult.confidence,
            method: "gemini-1.5-flash"
          };
        }
      } catch (error) {
        console.error("Gemini classification failed, falling back to rules:", error);
        relevance = classifyRelevance(record.title, record.excerpt);
        if (relevance.relevanceStatus === "ACCEPTED") {
          annotation = { ...extractPerspective(record.title, record.excerpt), method: "rules_fallback" };
        }
      }
    } else {
      relevance = classifyRelevance(record.title, record.excerpt);
      if (relevance.relevanceStatus === "ACCEPTED") {
        annotation = { ...extractPerspective(record.title, record.excerpt), method: "rules_with_evidence" };
      }
    }

    const source = await prisma.sourceRecord.upsert({
      where: { url: record.url },
      create: {
        sourceType: record.sourceType,
        title: record.title,
        url: record.url,
        excerpt: record.excerpt ?? "",
        publishedAt: record.publishedAt,
        author: record.author,
        platform: record.platform,
        rawMeta: (record.rawMeta ?? {}) as Prisma.InputJsonValue,
        ...relevance
      },
      update: {
        title: record.title,
        excerpt: record.excerpt ?? "",
        publishedAt: record.publishedAt,
        author: record.author,
        platform: record.platform,
        rawMeta: (record.rawMeta ?? {}) as Prisma.InputJsonValue,
        ...relevance
      }
    });

    if (relevance.relevanceStatus === "ACCEPTED" && annotation) {
      await prisma.perspectiveAnnotation.upsert({
        where: {
          sourceId_perspectiveTheme_targetEntity_evidenceExcerpt: {
            sourceId: source.id,
            perspectiveTheme: annotation.perspectiveTheme,
            targetEntity: annotation.targetEntity,
            evidenceExcerpt: annotation.evidenceExcerpt
          }
        },
        create: { sourceId: source.id, ...annotation },
        update: annotation
      });
    }

    saved += 1;
  }

  return saved;
}

