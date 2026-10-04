import { toast } from "sonner";
import type { InferRequestType, InferResponseType } from "hono/client";
import { client } from "@/lib/api/apiClient";
import { assertOk } from "@/lib/api/apiHelpers";

const dashboard = client.dashboard;

type FetchOptions = { signal?: AbortSignal };

type TableQuery = Record<string, string | Array<string>>;

export type UserStatus = InferRequestType<
  (typeof dashboard)[":id"]["status"]["$patch"]
>["json"]["status"];
export type UserRole = InferRequestType<
  (typeof dashboard)[":id"]["role"][":roleName"]["$post"]
>["param"]["roleName"];
export type DashboardRoleRow = InferResponseType<
  (typeof dashboard)["roles"]["$get"]
>["data"];
export type MemberRow = InferResponseType<
  (typeof dashboard)["members"]["$get"]
>["data"][number];
export type AssignmentTable = InferResponseType<
  (typeof dashboard)["assignments"]["$get"]
>["data"];

export async function getUserStatus(id: string, { signal }: FetchOptions = {}) {
  const res = await dashboard[":id"].status.$get(
    { param: { id } },
    { init: { signal } }
  );

  await assertOk(res);
  const { status } = await res.json();

  return status;
}

export async function toggleAFK(
  id: string,
  status: UserStatus,
  { signal }: FetchOptions = {}
) {
  if (status == "suspended") {
    toast.error("Cannot mark suspended user as AFK.");
    return;
  }

  const newStatus = status == "active" ? "inactive" : "active";

  const res = await dashboard[":id"].status.$patch(
    {
      json: { status: newStatus },
      param: { id },
    },
    { init: { signal } }
  );

  await assertOk(res);
}

export async function setUserStatus(
  id: string,
  status: UserStatus,
  { signal }: FetchOptions = {}
) {
  const res = await dashboard[":id"].status.$patch(
    {
      json: { status },
      param: { id },
    },
    { init: { signal } }
  );

  await assertOk(res);
  const { data: newStatus } = await res.json();

  return newStatus;
}

export async function addRole(
  id: string,
  role: UserRole,
  { signal }: FetchOptions = {}
) {
  const res = await dashboard[":id"].role[":roleName"].$post(
    {
      param: { id, roleName: role },
    },
    { init: { signal } }
  );

  await assertOk(res);
}

export async function removeRole(
  id: string,
  role: UserRole,
  { signal }: FetchOptions = {}
) {
  const res = await dashboard[":id"].role[":roleName"].$delete(
    {
      param: { id, roleName: role },
    },
    { init: { signal } }
  );

  await assertOk(res);
}

export async function fetchRoleTable(
  query: TableQuery,
  { signal }: FetchOptions = {}
) {
  const res = await dashboard.roles.$get({ query }, { init: { signal } });

  await assertOk(res);
  return res.json();
}

export async function fetchMembersTable(
  query: TableQuery,
  { signal }: FetchOptions = {}
) {
  const res = await dashboard.members.$get({ query }, { init: { signal } });

  await assertOk(res);
  return res.json();
}

export async function fetchAssignmentsTable(
  query: TableQuery,
  { signal }: FetchOptions = {}
) {
  const res = await dashboard.assignments.$get({ query }, { init: { signal } });

  await assertOk(res);
  return res.json();
}

export async function suspendUser(id: string, { signal }: FetchOptions = {}) {
  const res = await dashboard[":id"].suspend.$patch(
    { param: { id } },
    { init: { signal } }
  );

  await assertOk(res);
}

export async function unsuspendUser(id: string, { signal }: FetchOptions = {}) {
  const res = await dashboard[":id"].unsuspend.$patch(
    { param: { id } },
    { init: { signal } }
  );

  await assertOk(res);
}

export async function reassignPanelMember(
  id: string,
  panel_id: string,
  { signal }: FetchOptions = {}
) {
  const res = await dashboard[":id"].reassign[":panel_id"].$patch(
    { param: { id, panel_id } },
    { init: { signal } }
  );

  await assertOk(res);
}
