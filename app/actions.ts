"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { SourceType } from "../generated/prisma";
import { prisma } from "@/lib/prisma";
import { runAdapter } from "@/lib/ingest/adapters";
import { canonicalizeUrl } from "@/lib/url";

export async function createSubmission(formData: FormData) {
  await prisma.submittedData.create({
    data: {
      submissionType: String(formData.get("submissionType") ?? "source_url"),
      title: String(formData.get("title") ?? ""),
      url: canonicalizeUrl(String(formData.get("url") ?? "")) || null,
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
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: role as any },
    create: {
      email,
      name: email.split("@")[0],
      role: role as any
    }
  });

  const cookieStore = await cookies();
  cookieStore.set("user_email", user.email, { path: "/" });
  cookieStore.set("user_role", user.role, { path: "/" });
  if (user.role === "ADMIN") {
    cookieStore.set("admin_session", "true", { path: "/" });
  } else {
    cookieStore.delete("admin_session");
  }
  revalidatePath("/profile");
  revalidatePath("/admin/submitted-data");
  redirect("/profile");
}

export async function registerAndLoginUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "USER") as any;

  if (!email) {
    throw new Error("Email is required");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name || undefined,
      role
    },
    create: {
      email,
      name: name || email.split("@")[0],
      role
    }
  });

  const cookieStore = await cookies();
  cookieStore.set("user_email", user.email, { path: "/" });
  cookieStore.set("user_role", user.role, { path: "/" });
  if (user.role === "ADMIN") {
    cookieStore.set("admin_session", "true", { path: "/" });
  } else {
    cookieStore.delete("admin_session");
  }
  revalidatePath("/profile");
  revalidatePath("/admin/submitted-data");
  redirect("/profile");
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("user_email");
  cookieStore.delete("user_role");
  cookieStore.delete("admin_session");
  revalidatePath("/profile");
  revalidatePath("/admin/submitted-data");
  redirect("/profile");
}

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  const expectedUser = process.env.ADMIN_BASIC_USER || "creativelab.co.th@gmail.com";
  const expectedPassword = process.env.ADMIN_BASIC_PASSWORD || "I@M_Cr3LabTH_F4M";

  if (email === expectedUser && password === expectedPassword) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN" },
      create: { email, name: "Admin", role: "ADMIN" }
    });

    const cookieStore = await cookies();
    cookieStore.set("user_email", user.email, { path: "/" });
    cookieStore.set("user_role", "ADMIN", { path: "/" });
    cookieStore.set("admin_session", "true", { path: "/" });
    
    revalidatePath("/admin/submitted-data");
    revalidatePath("/");
    redirect("/admin/submitted-data");
  } else {
    redirect("/admin-login?error=invalid_credentials");
  }
}

export async function setLanguage(lang: "en" | "th") {
  const cookieStore = await cookies();
  cookieStore.set("lang", lang, { path: "/" });
  revalidatePath("/", "layout");
}
