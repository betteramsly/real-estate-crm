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
  new: "bg-primary/10 text-primary",
  in_progress: "bg-gold/20 text-foreground",
  won: "bg-grey/20 text-foreground",
  lost: "bg-destructive/10 text-destructive",
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
  active: "bg-primary/10 text-primary",
  reserved: "bg-gold/20 text-foreground",
  sold: "bg-grey/20 text-foreground",
  archived: "bg-muted text-muted-foreground",
};

export const RELEVANCE_LABELS: Record<1 | 2 | 3, string> = {
  1: "\u2b50",
  2: "\u2b50\u2b50",
  3: "\u2b50\u2b50\u2b50",
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
  new: "bg-primary",
  viewing: "bg-gold",
  negotiation: "bg-grey",
  contract: "bg-muted-foreground",
  closed_won: "bg-foreground",
  closed_lost: "bg-destructive",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Сделано",
  cancelled: "Отменена",
};

export const TASK_STATUS_VARIANTS: Record<TaskStatus, string> = {
  todo: "bg-primary/10 text-primary",
  in_progress: "bg-gold/20 text-foreground",
  done: "bg-grey/20 text-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const TASK_PRIORITY_VARIANTS: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-gold/20 text-foreground",
  high: "bg-destructive/10 text-destructive",
};
