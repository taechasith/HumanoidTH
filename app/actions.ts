"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runAdapter } from "@/lib/ingest/adapters";

export async function createSubmission(formData: FormData) {
  await prisma.submittedData.create({
    data: {
      submissionType: String(formData.get("submissionType") ?? "source_url"),
      title: String(formData.get("title") ?? ""),
      url: String(formData.get("url") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      submitterName: String(formData.get("submitterName") ?? "") || null,
      submitterContact: String(formData.get("submitterContact") ?? "") || null,
      status: "QUEUED"
    }
  });

  revalidatePath("/admin/submitted-data");
  redirect("/admin/submitted-data");
}

export async function updateSubmissionStatus(id: string, status: "APPROVED" | "REJECTED" | "NEEDS_REVIEW") {
  await prisma.submittedData.update({ where: { id }, data: { status } });
  revalidatePath("/admin/submitted-data");
}

export async function runDataPull(formData: FormData) {
  const adapter = String(formData.get("adapter") ?? "OPENALEX") as SourceType;
  const query = String(formData.get("query") ?? "").trim();
  const limit = Number(formData.get("limit") ?? 10);

  if (!query) {
    throw new Error("Query is required.");
  }

  const job = await prisma.sourcePullJob.create({
    data: { adapter, query, status: "RUNNING", startedAt: new Date() }
  });

  try {
    const result = await runAdapter(adapter, { query, limit });
    await prisma.sourcePullJob.update({
      where: { id: job.id },
      data: {
        status: result.missingKeys?.length ? "SKIPPED_MISSING_KEY" : "SUCCEEDED",
        recordsFound: result.recordsFound,
        recordsSaved: result.recordsSaved,
        errorMessage: result.missingKeys?.join(", ") || null,
        finishedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.sourcePullJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown ingestion error",
        finishedAt: new Date()
      }
    });
  }

  revalidatePath("/data-pulls");
  revalidatePath("/");
}

export async function loginAsUser(email: string, role: string) {
  const cookieStore = await cookies();
  cookieStore.set("user_email", email, { path: "/" });
  cookieStore.set("user_role", role, { path: "/" });
  revalidatePath("/profile");
  revalidatePath("/admin/submitted-data");
  redirect("/profile");
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("user_email");
  cookieStore.delete("user_role");
  revalidatePath("/profile");
  revalidatePath("/admin/submitted-data");
  redirect("/profile");
}

export async function setLanguage(lang: "en" | "th") {
  const cookieStore = await cookies();
  cookieStore.set("lang", lang, { path: "/" });
  revalidatePath("/", "layout");
}

