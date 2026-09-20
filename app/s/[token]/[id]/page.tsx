import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ComplexHero } from "@/components/catalog/complex-hero";
import { ComplexSections } from "@/components/catalog/complex-sections";
import { ShareChrome } from "@/components/share/share-chrome";
import { ShareContactDock } from "@/components/share/share-contact";
import { ShareTracker } from "@/components/share/share-tracker";
import { loadCatalogShare } from "@/lib/actions/catalog-share";
import { isShareId, shareInvalidCopy, sharePath } from "@/lib/catalog-share";
import { cn } from "@/lib/utils";

export default async function SharePropertyPage(props: {
  params: Promise<{ token: string; id: string }>;
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

  if (!isShareId(params.id)) notFound();
  const property = share.properties.find((item) => item.id === params.id);
  if (!property) notFound();

  return (
    <>
      <ShareChrome expiresAt={share.expires_at} />
      <ShareTracker token={params.token} event="open" />
      <ShareTracker
        token={params.token}
        event="view"
        propertyId={property.id}
      />
      {share.agent?.whatsapp ? (
        <ShareContactDock
          token={params.token}
          agent={share.agent}
          shareTitle={share.title}
          propertyTitle={property.title}
          propertyId={property.id}
        />
      ) : null}
      <main
        className={cn(
          "mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8",
          share.agent?.whatsapp && "pb-24",
        )}
      >
        <Breadcrumbs
          items={[
            { label: share.title || "Подборка", href: sharePath(params.token) },
            { label: property.title },
          ]}
        />
        <ComplexHero property={property} hideRelevance />
        <ComplexSections property={property} presentMode guest />
      </main>
    </>
  );
}
