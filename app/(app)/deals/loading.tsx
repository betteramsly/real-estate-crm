import {
  KanbanSkeleton,
  PageHeaderSkeleton,
} from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <KanbanSkeleton />
    </>
  );
}
