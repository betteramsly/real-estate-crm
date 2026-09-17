import { Building2 } from "lucide-react";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { ShareChrome } from "@/components/share/share-chrome";
import { ShareContactDock } from "@/components/share/share-contact";
import { ShareTracker } from "@/components/share/share-tracker";
import { EmptyState } from "@/components/ui/empty-state";
import { loadCatalogShare } from "@/lib/actions/catalog-share";
import { complexCountLabel, shareInvalidCopy } from "@/lib/catalog-share";
import { cn } from "@/lib/utils";

export default async function SharePage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = await props.params;
  const share = await loadCatalogShare(params.token);

  if (!share.ok) {
    const copy = shareInvalidCopy();
    return (
      <>
        <ShareChrome />
        <main className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {copy.description}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <ShareChrome expiresAt={share.expires_at} />
      <ShareTracker token={params.token} event="open" />
      {share.agent?.whatsapp ? (
        <ShareContactDock
          token={params.token}
          agent={share.agent}
          shareTitle={share.title}
        />
      ) : null}
      <main
        className={cn(
          "mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8",
          share.agent?.whatsapp && "pb-24",
        )}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            MANTAEV CAPITAL
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {share.title || "Подборка"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {complexCountLabel(share.properties.length)} для сравнения
          </p>
        </div>
        {share.properties.length ? (
          <CatalogGrid
            properties={share.properties}
            hrefBase={`/s/${encodeURIComponent(params.token)}`}
            hideRelevance
            guest
            pageSize={12}
          />
        ) : (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="Комплексы недоступны"
            description="Попросите агента прислать новую ссылку."
          />
        )}
      </main>
    </>
  );
}
