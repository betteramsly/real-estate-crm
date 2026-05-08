import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CardsGridSkeleton } from "@/components/loading-skeletons";
import { PropertiesFilters } from "./properties-filters";

export default function PropertiesLoading() {
  return (
    <>
      <PageHeader
        title="Объекты"
        description="Каталог объектов недвижимости агентства"
        actions={
          <Button asChild>
            <Link href="/properties/new">
              <Plus className="h-4 w-4" />
              Добавить объект
            </Link>
          </Button>
        }
      />

      <PropertiesFilters />

      <CardsGridSkeleton cards={6} />
    </>
  );
}
