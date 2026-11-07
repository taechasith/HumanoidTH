import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BASE_HEADERS, getPassportResponse } from "@/lib/hri/passport-api";
import { consumeRateLimit, peekRateLimit } from "@/lib/hri/rate-limit";
import { clientId } from "@/lib/hri/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ token: string }>;

// Robot-facing HRI Passport profile. The token is the 256-bit access token carried in the passport QR.
// Docs: docs/hri-passport-api.md
export async function GET(req: Request, { params }: { params: Params }) {
  const { token } = await params;
  try {
    const res = await getPassportResponse(token, clientId(req.headers), {
      findByAccessTokenHash: (hash) =>
        prisma.hriPassport.findUnique({
          where: { accessTokenHash: hash },
          select: {
            comfortDistance: true, speed: true, gaze: true, language: true, speechPace: true, greeting: true,
            voice: true, captions: true, noReach: true, anxiety: true, status: true, version: true,
            updatedAt: true, expiresAt: true
          }
        }),
      consume: consumeRateLimit,
      peek: peekRateLimit,
      now: () => new Date()
    });
    return NextResponse.json(res.body, { status: res.status, headers: res.headers });
  } catch (error) {
    console.error("HRI passport API failed", error);
    return NextResponse.json(
      { error: "server_error", message: "The passport service is temporarily unavailable." },
      { status: 500, headers: BASE_HEADERS }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: BASE_HEADERS });
}
