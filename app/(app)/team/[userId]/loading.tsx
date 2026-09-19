import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamMemberLoading() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Команда", href: "/team" },
          { label: "Загрузка..." },
        ]}
      />
      <PageHeader title="Сотрудник" description="Предложения по карточкам ЖК" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </>
  );
}
