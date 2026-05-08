import {
  CardsGridSkeleton,
  FiltersSkeleton,
  PageHeaderSkeleton,
} from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FiltersSkeleton count={3} />
      <CardsGridSkeleton cards={6} />
    </>
  );
}
