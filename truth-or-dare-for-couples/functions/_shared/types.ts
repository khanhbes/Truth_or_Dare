/// <reference types="@cloudflare/workers-types" />

export interface CloudflareEnv {
  DB: D1Database;
  CARD_ASSETS: R2Bucket;
  CARD_BACKUPS: R2Bucket;
  ENVIRONMENT?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_ADMIN_EMAIL?: string;
}

export interface FunctionData extends Record<string, unknown> {
  adminEmail?: string;
}

export type AppPagesFunction = PagesFunction<CloudflareEnv, string, FunctionData>;

export interface CatalogMetaRow {
  schema_version: number;
  dataset_revision: number;
  seeded_at: string | null;
  updated_at: string;
  last_backup_at: string | null;
}

export interface JsonEntityRow {
  id?: string;
  card_id?: string;
  config_key?: string;
  json: string;
  revision: number;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface AssetRow {
  id: string;
  r2_key: string;
  sha256: string;
  mime_type: string;
  size: number;
  revision: number;
  created_at: string;
}

export interface CoupleAccountRow {
  id: string;
  couple_name: string;
  pin_hash: string;
  unlocked_cards: string;
  total_cards_opened: number;
  created_at: string;
  last_login_at: string;
  settings_json?: string | null;
}
