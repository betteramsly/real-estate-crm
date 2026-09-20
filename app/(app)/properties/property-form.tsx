"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { DocumentFilesField } from "@/components/catalog/document-files-field";
import { PhotoField } from "@/components/catalog/photo-field";
import { SuggestInput } from "@/components/suggest-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/required-mark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type PropertyFormState,
  createPropertyAction,
  updatePropertyAction,
} from "@/lib/actions/properties";
import {
  addCatalogFilterOptionAction,
  removeCatalogFilterOptionAction,
} from "@/lib/actions/catalog-filter-options";
import {
  EMPTY_CATALOG_FILTER_EXTRAS,
  mergeFilterOptions,
  type CatalogFilterExtraKey,
  type CatalogFilterExtras,
} from "@/lib/catalog-filter-options";
import {
  catalogLocationPhotos,
  catalogPhotos,
  catalogPricePhotos,
  getCatalog,
  looksLikeUrl,
} from "@/lib/catalog";
import type { PropertyFormSuggestions } from "@/lib/property-form-suggestions";
import type {
  CatalogDocument,
  CatalogFact,
  CatalogTermItem,
  Property,
  PropertyInternal,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type { PropertyFormSuggestions };

function formStreetAddress(
  property: Property | undefined,
  catalog: ReturnType<typeof getCatalog>,
) {
  const fromCatalog = catalog.location?.address
    ?.replace(/\s+[—-]\s*2ГИС$/i, "")
    .trim();
  if (fromCatalog && !looksLikeUrl(fromCatalog)) return fromCatalog;
  return property?.address ?? "";
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-w-40">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Field({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

function PairRows({
  name,
  rows,
  setRows,
  labelA,
  labelB,
}: {
  name: string;
  rows: CatalogFact[] | CatalogTermItem[];
  setRows: (rows: CatalogFact[]) => void;
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.length ? (
        <div className="hidden gap-2 px-1 text-xs text-muted-foreground md:grid md:grid-cols-[1fr_1fr_auto]">
          <span>{labelA}</span>
          <span>{labelB}</span>
          <span className="w-9" />
        </div>
      ) : null}
      {rows.map((row, index) => (
        <div
          key={`${name}-${index}`}
          className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
        >
          <Input
            value={row.label}
            placeholder={labelA}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, label: event.target.value };
              setRows(next);
            }}
          />
          <Input
            value={row.value}
            placeholder={labelB}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, value: event.target.value };
              setRows(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRows(rows.filter((_, item) => item !== index))}
            aria-label="Удалить строку"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows([...rows, { label: "", value: "" }])}
      >
        <Plus className="h-4 w-4" />
        Добавить строку
      </Button>
    </div>
  );
}

export function PropertyForm({
  property,
  internal,
  suggestions,
}: {
  property?: Property;
  internal?: PropertyInternal | null;
  suggestions?: PropertyFormSuggestions;
}) {
  const router = useRouter();
  const action = property
    ? updatePropertyAction.bind(null, property.id)
    : createPropertyAction;
  const [state, formAction] = useActionState<PropertyFormState, FormData>(
    action,
    {},
  );
  const catalog = getCatalog(property);
  const [extras, setExtras] = React.useState<CatalogFilterExtras>(
    () => suggestions?.extras ?? EMPTY_CATALOG_FILTER_EXTRAS,
  );
  React.useEffect(() => {
    if (suggestions?.extras) setExtras(suggestions.extras);
  }, [suggestions]);
  const developers = mergeFilterOptions(
    suggestions?.developers ?? [],
    extras.developer,
  );
  const cities = mergeFilterOptions(suggestions?.cities ?? [], extras.city);
  const districts = mergeFilterOptions(
    suggestions?.districts ?? [],
    extras.district,
  );
  const years = mergeFilterOptions(
    suggestions?.years ?? [],
    extras.completion_year,
  );
  const installments = mergeFilterOptions(
    suggestions?.installments ?? [],
    extras.installment,
  );

  const remember = (key: CatalogFilterExtraKey) => (value: string) => {
    setExtras((current) => ({
      ...current,
      [key]: mergeFilterOptions(current[key], [value]),
    }));
    void addCatalogFilterOptionAction(key, value).then((result) => {
      if (result.error) toast.error(result.error);
    });
  };
  const forget = (key: CatalogFilterExtraKey) => (value: string) => {
    setExtras((current) => ({
      ...current,
      [key]: current[key].filter(
        (item) => item.toLowerCase() !== value.trim().toLowerCase(),
      ),
    }));
    void removeCatalogFilterOptionAction(key, value).then((result) => {
      if (result.error) toast.error(result.error);
    });
  };
  const [facts, setFacts] = React.useState<CatalogFact[]>(catalog.facts ?? []);
  const [installmentItems, setInstallmentItems] = React.useState<
    CatalogTermItem[]
  >(catalog.installment?.[0]?.items ?? []);
  const [commercialItems, setCommercialItems] = React.useState<CatalogTermItem[]>(
    catalog.commercial?.[0]?.items ?? [],
  );
  const [documents, setDocuments] = React.useState<CatalogDocument[]>(
    catalog.documents ?? [],
  );

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.redirectTo) {
      router.push(state.redirectTo);
      return;
    }
    if (state.success) toast.success("Изменения сохранены");
  }, [router, state]);

  const fe = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="mx-auto max-w-3xl space-y-5 max-md:[&_input]:text-base max-md:[&_select]:text-base max-md:[&_textarea]:text-base"
    >
      <FormSection title="Фотографии">
        <Field className="md:col-span-2">
          <PhotoField
            name="photos_json"
            filesName="photo_files"
            urls={property ? catalogPhotos(property) : []}
            markCover
          />
        </Field>
      </FormSection>

      <FormSection
        title="Основное"
        hint="Как комплекс называется в базе и кто его строит."
      >
        <Field className="md:col-span-2">
          <Label htmlFor="title">
            Название ЖК <RequiredMark />
          </Label>
          <Input
            id="title"
            name="title"
            defaultValue={property?.title ?? ""}
            required
            placeholder="Например, Авалон"
          />
          {fe.title ? (
            <p className="text-xs text-destructive">{fe.title}</p>
          ) : null}
        </Field>
        <Field>
          <Label htmlFor="developer">Застройщик</Label>
          <SuggestInput
            id="developer"
            name="developer"
            label="Застройщик"
            options={developers}
            customOptions={extras.developer}
            defaultValue={property?.developer ?? ""}
            placeholder="Фаворит"
            onCommit={remember("developer")}
            onRemove={forget("developer")}
          />
        </Field>
        <Field>
          <Label>Актуальность</Label>
          <Select
            name="relevance"
            defaultValue={
              property?.relevance ? String(property.relevance) : "unknown"
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Не указана" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Не указана</SelectItem>
              <SelectItem value="1">1 звезда</SelectItem>
              <SelectItem value="2">2 звезды</SelectItem>
              <SelectItem value="3">3 звезды</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FormSection>

      <FormSection
        title="Расположение"
        hint="Адрес для карточки и ссылка, которую агент откроет клиенту на карте."
      >
        <Field>
          <Label htmlFor="city">Город</Label>
          <SuggestInput
            id="city"
            name="city"
            label="Город"
            options={cities}
            customOptions={extras.city}
            defaultValue={property?.city ?? ""}
            placeholder="Грозный"
            onCommit={remember("city")}
            onRemove={forget("city")}
          />
        </Field>
        <Field>
          <Label htmlFor="district">Район</Label>
          <SuggestInput
            id="district"
            name="district"
            label="Район"
            options={districts}
            customOptions={extras.district}
            defaultValue={property?.district ?? ""}
            placeholder="Новый район"
            onCommit={remember("district")}
            onRemove={forget("district")}
          />
        </Field>
        <Field className="md:col-span-2">
          <Label htmlFor="address">Улица и дом</Label>
          <Input
            id="address"
            name="address"
            defaultValue={formStreetAddress(property, catalog)}
            placeholder="улица Гуцериева, 80"
          />
        </Field>
        <Field className="md:col-span-2">
          <Label htmlFor="map_url">Ссылка на карту</Label>
          <Input
            id="map_url"
            name="map_url"
            defaultValue={catalog.location?.map_url ?? ""}
            placeholder="https://go.2gis.com/..."
          />
        </Field>
        <Field className="md:col-span-2">
          <PhotoField
            name="location_photos_json"
            filesName="location_files"
            urls={property ? catalogLocationPhotos(property) : []}
            label="Фото расположения"
            hint="Карта, схема проезда или вид с улицы."
          />
        </Field>
      </FormSection>

      <FormSection
        title="О комплексе"
        hint="Текст, который клиент читает первым. Коротко: чем дом отличается и что важно знать."
      >
        <Field className="md:col-span-2">
          <Label htmlFor="about">Описание</Label>
          <Textarea
            id="about"
            name="about"
            rows={6}
            defaultValue={catalog.about || property?.description || ""}
            placeholder="Этажность, фасад, скидки, обязательный платёж..."
          />
        </Field>
        <Field className="md:col-span-2">
          <div className="space-y-1">
            <Label>Характеристики</Label>
            <p className="text-sm text-muted-foreground">
              Короткие пары «параметр — значение», которые видны в карточке.
              Например: этажность — 16, фасад — кирпич, потолки — 3 м.
            </p>
          </div>
          <PairRows
            name="facts_json"
            rows={facts}
            setRows={setFacts}
            labelA="Параметр"
            labelB="Значение"
          />
        </Field>
      </FormSection>

      <FormSection
        title="Сдача и условия"
        hint="Когда дом сдаётся и какие условия покупки показывать в фильтрах."
      >
        <Field>
          <Label htmlFor="completion_year">Год сдачи</Label>
          <SuggestInput
            id="completion_year"
            name="completion_year"
            label="Год сдачи"
            options={years}
            customOptions={extras.completion_year}
            defaultValue={property?.completion_year ?? ""}
            placeholder="2027"
            onCommit={remember("completion_year")}
            onRemove={forget("completion_year")}
          />
        </Field>
        <Field>
          <Label htmlFor="rooms">Квартал сдачи</Label>
          <Input
            id="rooms"
            name="rooms"
            type="number"
            min="1"
            max="4"
            defaultValue={property?.rooms ?? ""}
            placeholder="1–4"
          />
        </Field>
        <Field>
          <Label htmlFor="installment_max">Рассрочка до</Label>
          <SuggestInput
            id="installment_max"
            name="installment_max"
            label="Рассрочка до"
            options={installments}
            customOptions={extras.installment}
            defaultValue={property?.installment_max ?? ""}
            placeholder="5 лет"
            onCommit={remember("installment")}
            onRemove={forget("installment")}
          />
        </Field>
        <Field>
          <Label>Принимается мат. капитал</Label>
          <Select
            name="maternity_capital"
            defaultValue={
              property?.maternity_capital === null ||
              property?.maternity_capital === undefined
                ? "unknown"
                : property.maternity_capital
                  ? "true"
                  : "false"
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Не указано</SelectItem>
              <SelectItem value="true">Да</SelectItem>
              <SelectItem value="false">Нет</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field className="md:col-span-2 md:max-w-xs">
          <Label>Наличный расчёт</Label>
          <Select
            name="cash_payment"
            defaultValue={
              property?.cash_payment === null ||
              property?.cash_payment === undefined
                ? "unknown"
                : property.cash_payment
                  ? "true"
                  : "false"
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Не указано</SelectItem>
              <SelectItem value="true">Да</SelectItem>
              <SelectItem value="false">Нет</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 md:col-span-2 md:grid-cols-2 md:items-stretch">
          <Field className="grid h-full grid-rows-[auto_1fr_auto] gap-2 space-y-0">
            <div className="space-y-1">
              <Label>Таблица рассрочки</Label>
              <p className="text-sm text-muted-foreground">
                Срок и наценка, как в карточке.
              </p>
            </div>
            <PairRows
              name="installment_json"
              rows={installmentItems}
              setRows={setInstallmentItems}
              labelA="Срок"
              labelB="Наценка"
            />
            <Textarea
              name="installment_note"
              rows={3}
              className="min-h-[4.5rem] resize-y"
              defaultValue={catalog.installment?.[0]?.note ?? ""}
              placeholder="Комментарий к рассрочке"
            />
          </Field>
          <Field className="grid h-full grid-rows-[auto_1fr_auto] gap-2 space-y-0">
            <div className="space-y-1">
              <Label>Коммерция</Label>
              <p className="text-sm text-muted-foreground">
                Помещения и цена за м², если есть.
              </p>
            </div>
            <PairRows
              name="commercial_json"
              rows={commercialItems}
              setRows={setCommercialItems}
              labelA="Объект"
              labelB="Цена"
            />
            <Textarea
              name="commercial_note"
              rows={3}
              className="min-h-[4.5rem] resize-y"
              defaultValue={catalog.commercial?.[0]?.note ?? ""}
              placeholder="Комментарий к коммерции"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Документы и цены"
        hint="Ссылки на шахматку, планировки и фото прайса."
      >
        <Field className="md:col-span-2">
          <Label>Ссылки</Label>
          <input
            type="hidden"
            name="documents_json"
            value={JSON.stringify(documents)}
          />
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={`doc-${index}`}
                className="grid gap-2 md:grid-cols-[1fr_2fr_auto]"
              >
                <Input
                  value={doc.title}
                  placeholder="Шахматка"
                  onChange={(event) => {
                    const next = [...documents];
                    next[index] = { ...doc, title: event.target.value };
                    setDocuments(next);
                  }}
                />
                <Input
                  value={doc.url}
                  placeholder="https://..."
                  onChange={(event) => {
                    const next = [...documents];
                    next[index] = { ...doc, url: event.target.value };
                    setDocuments(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setDocuments(documents.filter((_, item) => item !== index))
                  }
                  aria-label="Удалить ссылку"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDocuments([
                  ...documents,
                  { title: "", url: "", kind: "other" },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Добавить ссылку
            </Button>
          </div>
        </Field>
        <DocumentFilesField />
        <Field className="md:col-span-2">
          <PhotoField
            name="price_photos_json"
            filesName="price_files"
            urls={property ? catalogPricePhotos(property) : []}
            label="Фото прайса"
            hint="Скриншоты цен, которые показываются в блоке «Цены»."
          />
        </Field>
      </FormSection>

      <FormSection
        title="Для сотрудников"
        hint="Эти поля видит только команда после кода доступа."
      >
        <Field>
          <Label htmlFor="commission">Комиссия</Label>
          <Textarea
            id="commission"
            name="commission"
            rows={3}
            defaultValue={internal?.commission ?? ""}
          />
        </Field>
        <Field>
          <Label htmlFor="investor">Инвесторские условия</Label>
          <Textarea
            id="investor"
            name="investor"
            rows={3}
            defaultValue={internal?.investor ?? ""}
          />
        </Field>
        <Field>
          <Label htmlFor="stop_sales">Стоп-продажи</Label>
          <Textarea
            id="stop_sales"
            name="stop_sales"
            rows={3}
            defaultValue={internal?.stop_sales ?? ""}
          />
        </Field>
        <Field>
          <Label htmlFor="notes">Внутренние пометки</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={internal?.notes ?? ""}
          />
        </Field>
      </FormSection>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-0 md:rounded-2xl md:border md:px-5">
        <SubmitButton label={property ? "Сохранить" : "Опубликовать объект"} />
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
