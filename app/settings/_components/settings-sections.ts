/** Settings routes: `/settings/<area>/<section>`. Kept free of JSX so route files can import it cheaply. */
export const ORGANIZATION_SECTIONS = ["general", "members", "api-secrets"] as const;
export const ACCOUNT_SECTIONS = ["profile", "security"] as const;

export type OrganizationSection = (typeof ORGANIZATION_SECTIONS)[number];
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

export function isOrganizationSection(value: string): value is OrganizationSection {
  return (ORGANIZATION_SECTIONS as readonly string[]).includes(value);
}

export function isAccountSection(value: string): value is AccountSection {
  return (ACCOUNT_SECTIONS as readonly string[]).includes(value);
}
