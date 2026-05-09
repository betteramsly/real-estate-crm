export type UserRole = "admin" | "agent";

export type ClientStatus = "new" | "in_progress" | "won" | "lost";
export type ClientSource =
  | "referral"
  | "cian"
  | "avito"
  | "instagram"
  | "other";
export type DealType = "buy" | "sell" | "rent_in" | "rent_out";

export type PropertyType = "apartment" | "house" | "commercial" | "land";
export type ListingType = "sale" | "rent";
export type PropertyStatus = "active" | "reserved" | "sold" | "archived";

export type DealStage =
  | "new"
  | "viewing"
  | "negotiation"
  | "contract"
  | "closed_won"
  | "closed_lost";

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: ClientSource;
  status: ClientStatus;
  budget_min: number | null;
  budget_max: number | null;
  deal_type: DealType;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  title: string;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  price: number;
  area: number | null;
  rooms: number | null;
  address: string | null;
  city: string | null;
  district: string | null;
  description: string | null;
  cover_url: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title: string;
  client_id: string | null;
  property_id: string | null;
  stage: DealStage;
  amount: number | null;
  commission: number | null;
  expected_close_date: string | null;
  closed_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  client_id: string | null;
  deal_id: string | null;
  property_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithRelations extends Client {
  assignee?: Profile | null;
}

export interface PropertyWithRelations extends Property {
  assignee?: Profile | null;
}

export interface DealWithRelations extends Deal {
  client?: Pick<Client, "id" | "full_name"> | null;
  property?: Pick<Property, "id" | "title"> | null;
  assignee?: Profile | null;
}

export interface TaskWithRelations extends Task {
  client?: Pick<Client, "id" | "full_name"> | null;
  deal?: Pick<Deal, "id" | "title"> | null;
  property?: Pick<Property, "id" | "title"> | null;
  assignee?: Profile | null;
}

export type ActivityEntityType = "client" | "deal" | "property" | "task";
export type ActivityType =
  | "created"
  | "updated"
  | "deleted"
  | "stage_changed"
  | "status_changed"
  | "task_completed"
  | "note_added";

export interface Activity {
  id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  type: ActivityType;
  payload: Record<string, unknown>;
  client_id: string | null;
  deal_id: string | null;
  property_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface ActivityWithActor extends Activity {
  actor?: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
}
