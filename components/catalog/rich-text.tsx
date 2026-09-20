import { ExternalLink } from "lucide-react";
import { isClientExternalUrl } from "@/lib/catalog";
import { hrefFor, isHttpUrl, linkLabel, splitTextWithUrls } from "@/lib/linkify";

export function RichText({
  text,
  className,
  clientLinks = false,
  clientChess = true,
}: {
  text: string;
  className?: string;
  clientLinks?: boolean;
  clientChess?: boolean;
}) {
  return (
    <span className={className}>
      {splitTextWithUrls(text).map((part, index) => {
        if (part.type !== "url" || !isHttpUrl(part.value)) {
          return <span key={`${part.type}-${index}`}>{part.value}</span>;
        }
        if (
          clientLinks &&
          !isClientExternalUrl(part.value, "", { chess: clientChess })
        ) {
          return null;
        }
        return (
          <a
            key={`${part.type}-${index}`}
            href={hrefFor(part.value)}
            target="_blank"
            rel="noreferrer"
            className="inline break-words text-primary underline underline-offset-4 hover:opacity-80"
          >
            {linkLabel(part.value)}
            <ExternalLink className="mb-0.5 ml-1 inline h-3.5 w-3.5" />
          </a>
        );
      })}
    </span>
  );
}
