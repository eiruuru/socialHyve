import { decryptToken, encryptToken } from './tokenCrypto.ts';

export async function readToken(value: string | null | undefined): Promise<string> {
  if (!value) return '';
  return decryptToken(value);
}

export async function writeToken(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  return encryptToken(value);
}

export async function withDecryptedAccountTokens<T>(
  account: Record<string, unknown>,
  fn: (account: Record<string, unknown>) => Promise<T>,
): Promise<T> {
  const access_token = await readToken(account.access_token as string | undefined);
  const page_access_token = await readToken(account.page_access_token as string | undefined);
  const user_access_token = await readToken(account.user_access_token as string | undefined);
  return fn({
    ...account,
    access_token: access_token || account.access_token,
    page_access_token: page_access_token || access_token || account.page_access_token,
    user_access_token: user_access_token || account.user_access_token,
  });
}

export async function encryptAccountTokenFields(
  fields: Record<string, string | null | undefined>,
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value ? await writeToken(value) : null;
  }
  return out;
}
