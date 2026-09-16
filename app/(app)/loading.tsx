import { BrandLoader } from "@/components/brand-loader";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <BrandLoader label="Загрузка" />
    </div>
  );
}
