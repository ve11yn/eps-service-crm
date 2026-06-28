import "server-only";

export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

export function assertValidUsername(input: string): string {
  const username = normalizeUsername(input);

  if (username.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }

  if (username.length > 32) {
    throw new Error("Username must be at most 32 characters.");
  }

  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(username)) {
    throw new Error(
      "Username may only use letters, numbers, dot, dash, and underscore.",
    );
  }

  return username;
}

export function buildInternalAuthEmail(username: string): string {
  return `${username}@users.eps-crm.local`;
}
