import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              Добавить клиента
            </Link>
          </Button>
        }
      />

      <ClientsFilters />

      <TableSkeleton rows={7} columns={8} />
    </>
  );
}
