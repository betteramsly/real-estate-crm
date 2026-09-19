import { describe, expect, it } from "vitest";
import {
  hrefFor,
  linkLabel,
  safeExternalHref,
  splitTextWithUrls,
} from "@/lib/linkify";

const NOTION_PRICE =
  "https://file.notion.so/f/f/523ce78b-e415-45ed-aeb5-a747ee46d253/58cf9577-3ffc-435c-92cd-078250267b9a/ПРАИС_ЖК_WOLF-TOWERS_11.12.2025.pdf?table=block&id=33d3ae40-873b-801f-9603-f0011bc2946f&spaceId=523ce78b-e415-45ed-aeb5-a747ee46d253&expirationTimestamp=1789624800000&signature=TQB7OrTysN3JXzl7W0Grrz7Nu3xFlmOqSI-WblZCo64&downloadName=ПРАЙС+ЖК+WOLF-TOWERS+11.12.2025.pdf";

describe("linkify", () => {
  it("allows only safe external protocols", () => {
    expect(safeExternalHref("https://example.com/file.pdf")).toBe(
      "https://example.com/file.pdf",
    );
    expect(safeExternalHref("go.2gis.com/abc")).toBe(
      "https://go.2gis.com/abc",
    );
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,test")).toBeNull();
  });

  it("turns a Notion file URL into a filename label", () => {
    expect(linkLabel(NOTION_PRICE)).toBe("ПРАЙС ЖК WOLF-TOWERS 11.12.2025.pdf");
    expect(hrefFor(NOTION_PRICE)).toBe(NOTION_PRICE);
  });

  it("keeps surrounding text and isolates the URL", () => {
    expect(splitTextWithUrls(`Прайс ${NOTION_PRICE} здесь`)).toEqual([
      { type: "text", value: "Прайс " },
      { type: "url", value: NOTION_PRICE },
      { type: "text", value: " здесь" },
    ]);
  });

  it("does not swallow a period after a short URL", () => {
    expect(splitTextWithUrls("карта https://go.2gis.com/orc99.")).toEqual([
      { type: "text", value: "карта " },
      { type: "url", value: "https://go.2gis.com/orc99" },
      { type: "text", value: "." },
    ]);
  });

  it("uses the file name for a plain pdf path", () => {
    expect(
      linkLabel("https://disk.yandex.ru/i/eKLxrfu88tIkRw/price.pdf"),
    ).toBe("price.pdf");
  });
});
