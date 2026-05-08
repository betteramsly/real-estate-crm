import {
  FiltersSkeleton,
  ListCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FiltersSkeleton count={2} />
      <div className="space-y-2">
        <ListCardSkeleton />
      </div>
    </>
  );
}
