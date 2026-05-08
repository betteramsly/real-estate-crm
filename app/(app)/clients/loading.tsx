import {
  FiltersSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FiltersSkeleton count={3} />
      <TableSkeleton rows={7} columns={8} />
    </>
  );
}
