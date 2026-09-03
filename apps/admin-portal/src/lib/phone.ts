/**
 * Phone identifiers are typed by hand: "9682668266", "09682668266", "91 96826 68266" and
 * "+919682668266" must all find the same account regardless of how the employer stored it.
 * (The login route carries an identical local copy; keep the two in sync until it is refactored.)
 */
export const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '');

export const phoneVariants = (value: string): string[] => {
  const stripped = normalizePhone(value);
  const digits = stripped.replace(/^\+/, '');
  const variants = new Set<string>([stripped]);
  let local: string | null = null;
  if (/^[6-9]\d{9}$/.test(digits)) local = digits;
  else if (/^0[6-9]\d{9}$/.test(digits)) local = digits.slice(1);
  else if (/^91[6-9]\d{9}$/.test(digits)) local = digits.slice(2);
  if (local) [local, `0${local}`, `91${local}`, `+91${local}`].forEach((v) => variants.add(v));
  return [...variants];
};
