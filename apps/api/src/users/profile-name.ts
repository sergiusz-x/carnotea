function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function titleCase(token: string): string {
  if (!token) {
    return token;
  }

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function parseNameTokens(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseEmailTokens(email: string): string[] {
  const [localPart = 'user'] = email.trim().split('@');

  return localPart
    .split(/[._-]+/)
    .map((part) => titleCase(part.trim()))
    .filter(Boolean);
}

export function deriveProfileNames(input: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
}): { firstName: string; lastName: string } {
  const firstName = nonEmpty(input.firstName);
  const lastName = nonEmpty(input.lastName);

  if (firstName && lastName) {
    return { firstName, lastName };
  }

  const nameTokens = nonEmpty(input.name) ? parseNameTokens(input.name as string) : [];
  const fallbackTokens = nameTokens.length > 0 ? nameTokens : parseEmailTokens(input.email);

  const fallbackFirst = fallbackTokens[0] ?? 'User';
  const fallbackLast = fallbackTokens.slice(1).join(' ') || fallbackFirst;

  return {
    firstName: firstName ?? fallbackFirst,
    lastName: lastName ?? firstName ?? fallbackLast,
  };
}
