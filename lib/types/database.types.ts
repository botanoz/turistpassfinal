/**
 * Supabase Database Types
 *
 * Bu dosya Supabase CLI ile otomatik generate edilecek.
 * Şu anda tip güvenliği sağlaması için esnek bir placeholder içerir.
 *
 * Generate komutu (Supabase projesi oluşturduktan sonra):
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.types.ts
 *
 * Veya package.json'a script ekleyerek:
 * npm run generate-types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type GenericRecord = Record<string, any>

type GenericTable = {
  Row: GenericRecord
  Insert: GenericRecord
  Update: GenericRecord
  Relationships: never[]
}

type GenericFunction = {
  Args: GenericRecord
  Returns: any
}

export interface Database {
  public: {
    Tables: Record<string, GenericTable>
    Views: Record<string, GenericTable>
    Functions: Record<string, GenericFunction>
    Enums: Record<string, string>
    CompositeTypes: Record<string, any>
  }
}
