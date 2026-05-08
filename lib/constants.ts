import type {
  ClientSource,
  ClientStatus,
  DealStage,
  DealType,
  ListingType,
  PropertyStatus,
  PropertyType,
  TaskPriority,
  TaskStatus,
} from "./types";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  won: "Закрыт успешно",
  lost: "Потерян",
};

export const CLIENT_STATUS_VARIANTS: Record<ClientStatus, string> = {
  new: "bg-sky-500/15 text-sky-500",
  in_progress: "bg-amber-500/15 text-amber-500",
  won: "bg-emerald-500/15 text-emerald-500",
  lost: "bg-rose-500/15 text-rose-500",
};

export const CLIENT_SOURCE_LABELS: Record<ClientSource, string> = {
  referral: "Рекомендация",
  cian: "ЦИАН",
  avito: "Авито",
  instagram: "Instagram",
  other: "Другое",
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  buy: "Покупка",
  sell: "Продажа",
  rent_in: "Аренда",
  rent_out: "Сдача в аренду",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Квартира",
  house: "Дом",
  commercial: "Коммерческая",
  land: "Участок",
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale: "Продажа",
  rent: "Аренда",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  active: "Активен",
  reserved: "Бронь",
  sold: "Продан",
  archived: "Архив",
};

export const PROPERTY_STATUS_VARIANTS: Record<PropertyStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-500",
  reserved: "bg-amber-500/15 text-amber-500",
  sold: "bg-sky-500/15 text-sky-500",
  archived: "bg-muted text-muted-foreground",
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: "Новая",
  viewing: "Показ",
  negotiation: "Переговоры",
  contract: "Договор",
  closed_won: "Завершена",
  closed_lost: "Потеряна",
};

export const DEAL_STAGE_ORDER: DealStage[] = [
  "new",
  "viewing",
  "negotiation",
  "contract",
  "closed_won",
  "closed_lost",
];

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  new: "bg-sky-500",
  viewing: "bg-violet-500",
  negotiation: "bg-amber-500",
  contract: "bg-orange-500",
  closed_won: "bg-emerald-500",
  closed_lost: "bg-rose-500",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Сделано",
  cancelled: "Отменена",
};

export const TASK_STATUS_VARIANTS: Record<TaskStatus, string> = {
  todo: "bg-sky-500/15 text-sky-500",
  in_progress: "bg-amber-500/15 text-amber-500",
  done: "bg-emerald-500/15 text-emerald-500",
  cancelled: "bg-muted text-muted-foreground",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const TASK_PRIORITY_VARIANTS: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-500",
  high: "bg-rose-500/15 text-rose-500",
};
