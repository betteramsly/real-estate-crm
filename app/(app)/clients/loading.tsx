import { Plus } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/loading-skeletons";
import { ClientsFilters } from "./clients-filters";

export default function ClientsLoading() {
  return (
    <>
      <PageHeader
        title="Клиенты"
        description="Все клиенты и их статусы в одном месте"
        actions={
          <PrefetchLink href="/clients/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Добавить клиента
          </PrefetchLink>
        }
      />

      <ClientsFilters />

      <TableSkeleton rows={7} columns={8} />
    </>
  );
}
