import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/index";
import { admin, auth, env, makeUser } from "./helpers";
import { grantRole } from "./factories/identity";

// The old `.in(ids)` filter hit the gateway URL limit at 200-250 users (#482).
const USERS_PAST_URL_LIMIT = 300;

async function seedUsersUpTo(total: number) {
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw error;

  let missing = total - (count ?? 0);
  while (missing > 0) {
    const batch = Math.min(missing, 25);
    await Promise.all(
      Array.from({ length: batch }, async () => {
        const { error } = await admin.auth.admin.createUser({
          email: `test-${crypto.randomUUID()}@example.com`,
          email_confirm: true,
        });
        if (error) throw error;
      })
    );
    missing -= batch;
  }
}

describe("dashboard tables", () => {
  beforeAll(() => seedUsersUpTo(USERS_PAST_URL_LIMIT), 60_000);

  it.each(["/dashboard/members", "/dashboard/roles", "/dashboard/assignments"])(
    "GET %s returns 200 with 300 or more users",
    async (path) => {
      const { token, userId } = await makeUser();
      await grantRole(userId, "admin");

      const res = await app.request(path, auth(token), env);

      expect(res.status).toBe(200);
    }
  );
});
