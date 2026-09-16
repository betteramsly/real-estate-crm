const FILE_TOKEN = /^__file:(\d+)$/;

export function fileOrderToken(index: number) {
  return `__file:${index}`;
}

export function mergePhotoOrder(order: string[], uploaded: string[]): string[] {
  if (!order.length) return uploaded.filter(Boolean);
  if (!order.some((item) => FILE_TOKEN.test(item))) {
    return [...order, ...uploaded].filter(Boolean);
  }

  const next: string[] = [];
  for (const item of order) {
    const match = item.match(FILE_TOKEN);
    if (!match) {
      if (item) next.push(item);
      continue;
    }
    const url = uploaded[Number(match[1])];
    if (url) next.push(url);
  }
  return next;
}
