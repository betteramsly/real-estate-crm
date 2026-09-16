import { ExternalLink } from "lucide-react";
import { isClientExternalUrl } from "@/lib/catalog";

const URL_RE =
  /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?:yandex\.ru|2gis\.ru|go\.2gis\.com)[^\s<>"']*)/gi;

function isUrl(value: string) {
  return /^(https?:\/\/|www\.|yandex\.ru|2gis\.ru|go\.2gis\.com)/i.test(value);
}

function hrefFor(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function prettyUrl(url: string) {
  try {
    const parsed = new URL(hrefFor(url));
    const host = parsed.hostname.replace(/^www\./, "");
    const path = decodeURIComponent(parsed.pathname).replace(/\/$/, "");
    const tail = path.split("/").filter(Boolean).slice(-1)[0];
    return tail && tail.length < 40 ? `${host}/${tail}` : host;
  } catch {
    return url;
  }
}

export function RichText({
  text,
  className,
  clientLinks = false,
}: {
  text: string;
  className?: string;
  clientLinks?: boolean;
}) {
  const parts = text.split(URL_RE);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!isUrl(part)) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }
        if (clientLinks && !isClientExternalUrl(part)) {
          return null;
        }
        return (
          <a
            key={`${part}-${index}`}
            href={hrefFor(part)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            {prettyUrl(part)}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        );
      })}
    </span>
  );
}
