import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Mints an owner session cookie straight into Playwright's storage state.
 *
 * Driving the PIN screen would make every test depend on the seeded PIN hash,
 * which is factory-salted and changes whenever the factory is re-seeded. The
 * login screen deserves its own test; the rest of the suite should be testing
 * master data, not authentication.
 */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const owner = await prisma.user.findFirst({
      where: { role: { in: ["OWNER", "CO_OWNER"] }, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!owner) {
      throw new Error("No active owner in the database — run `npm run seed` before the e2e suite.");
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "fallback-secret-key-for-dev"
    );
    const token = await new SignJWT({
      userId: owner.id,
      factoryId: owner.factoryId,
      role: owner.role,
      language: owner.language ?? "en",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
    const { hostname } = new URL(baseURL);

    const storageState = {
      cookies: [
        {
          name: "verity_session",
          value: token,
          domain: hostname,
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          httpOnly: true,
          secure: false,
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    };

    const dir = path.join(process.cwd(), "e2e", ".auth");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "owner.json"), JSON.stringify(storageState, null, 2));
    console.log(`e2e: signed in as ${owner.name} (${owner.role})`);

    // Warm the heavy routes before the first assertion runs.
    //
    // The dev server compiles a route on first request, and Master Data renders
    // a catalogue of several hundred items — cold, that is slower than any
    // assertion timeout worth setting. Paying it here means a failure in the
    // suite is a real failure, not the first visitor absorbing a build.
    await Promise.all(
      ["/owner/master-data", "/owner/production"].map((route) =>
        fetch(`${baseURL}${route}`, { headers: { cookie: `verity_session=${token}` } }).catch(
          // A warm-up that cannot reach the server is not a reason to fail
          // setup; the tests themselves will report that clearly enough.
          () => undefined
        )
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}
