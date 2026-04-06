export const pluralizeRu = (count: number, forms: [string, string, string]): string => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;

  if (n > 10 && n < 20) return forms[2]; // 11–19
  if (n1 > 1 && n1 < 5) return forms[1]; // 2–4, 22–24...
  if (n1 === 1) return forms[0]; // 1, 21, 31...
  return forms[2]; // 0, 5–20, 25–30...
};

