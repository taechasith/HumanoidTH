// Prisma adapter for IdentityStore (tables "HriParticipant" and "HriEmailChallenge").
import { prisma } from "@/lib/prisma";
import type { IdentityStore } from "./identity";

export const prismaIdentityStore: IdentityStore = {
  async latestChallenge(email) {
    return prisma.hriEmailChallenge.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  },

  async replaceChallenge({ email, codeHash, expiresAt, now }) {
    const [, created] = await prisma.$transaction([
      prisma.hriEmailChallenge.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: now } }),
      prisma.hriEmailChallenge.create({ data: { email, codeHash, expiresAt, createdAt: now } })
    ]);
    // These rows hold raw email addresses and are useless a day after they expire, so every new
    // challenge clears them rather than leaving that to chance. A failed cleanup must not fail the sign-in.
    await prisma.hriEmailChallenge.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86_400_000) } } }).catch(() => undefined);
    return created;
  },

  async claimAttempt(id, maxAttempts) {
    // Conditional update: however many guesses arrive together, only maxAttempts can succeed.
    const { count } = await prisma.hriEmailChallenge.updateMany({
      where: { id, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } }
    });
    if (count === 0) return null;
    const row = await prisma.hriEmailChallenge.findUnique({ where: { id }, select: { attempts: true } });
    return row?.attempts ?? maxAttempts;
  },

  async consumeChallenge(id, now) {
    // Conditional update: two parallel verifications of the same code cannot both succeed.
    const { count } = await prisma.hriEmailChallenge.updateMany({ where: { id, consumedAt: null }, data: { consumedAt: now } });
    return count === 1;
  },

  async upsertParticipant(email, now) {
    return prisma.hriParticipant.upsert({
      where: { email },
      create: { email, verifiedAt: now },
      update: {},
      select: { id: true, email: true, sessionVersion: true }
    });
  },

  async findParticipant(id) {
    return prisma.hriParticipant.findUnique({ where: { id }, select: { id: true, email: true, sessionVersion: true } });
  },

  async deleteParticipant(id, email) {
    await prisma.$transaction([
      prisma.hriEmailChallenge.deleteMany({ where: { email } }),
      prisma.hriParticipant.deleteMany({ where: { id } })
    ]);
  }
};
