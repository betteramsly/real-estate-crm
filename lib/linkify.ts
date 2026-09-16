const TRAILING_PUNCT = /[.,;:!?)]+$/;

export function hrefFor(url: string) {
  const trimmed = url.trim().replace(TRAILING_PUNCT, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isHttpUrl(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value.trim());
}

function decodePlus(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.replace(/\+/g, " ").trim();
  }
}

export function linkLabel(url: string) {
  try {
    const parsed = new URL(hrefFor(url));
    const download = parsed.searchParams.get("downloadName");
    if (download) {
      const name = decodePlus(download);
      if (name) return name;
    }

    const path = decodePlus(parsed.pathname).replace(/\/$/, "");
    const file = path.split("/").filter(Boolean).at(-1);
    if (file && /\.[a-z0-9]{2,8}$/i.test(file) && file.length <= 80) {
      return file;
    }

    const host = parsed.hostname.replace(/^www\./, "");
    if (file && file.length < 40) return `${host}/${file}`;
    return host;
  } catch {
    return "Открыть ссылку";
  }
}

export function splitTextWithUrls(text: string) {
  const parts: Array<{ type: "text" | "url"; value: string }> = [];
  const re = /((?:https?:\/\/|www\.)[^\s<>"'«»]+)/gi;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }

    const raw = match[0];
    const punct = raw.match(TRAILING_PUNCT)?.[0] ?? "";
    const url = punct ? raw.slice(0, -punct.length) : raw;
    if (url) parts.push({ type: "url", value: url });
    if (punct) parts.push({ type: "text", value: punct });
    last = match.index + raw.length;
  }

  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }

  return parts.length ? parts : [{ type: "text" as const, value: text }];
}
