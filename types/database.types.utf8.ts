export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      designs: {
        Row: {
          id: number
          nama_design: string
        }
        Insert: {
          id?: number
          nama_design: string
        }
        Update: {
          id?: number
          nama_design?: string
        }
        Relationships: []
      }
      final_inspections: {
        Row: {
          id: number
          status_final: string
        }
        Insert: {
          id?: number
          status_final: string
        }
        Update: {
          id?: number
          status_final?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: number
          nama_grup: string
        }
        Insert: {
          id?: number
          nama_grup: string
        }
        Update: {
          id?: number
          nama_grup?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          id: number
          nama_operator: string
        }
        Insert: {
          id?: number
          nama_operator: string
        }
        Update: {
          id?: number
          nama_operator?: string
        }
        Relationships: []
      }
      problem_categories: {
        Row: {
          id: number
          nama_kategori: string
        }
        Insert: {
          id?: number
          nama_kategori: string
        }
        Update: {
          id?: number
          nama_kategori?: string
        }
        Relationships: []
      }
      problems: {
        Row: {
          category_id: number | null
          deskripsi_masalah: string
          id: number
          kode_masalah: string | null
        }
        Insert: {
          category_id?: number | null
          deskripsi_masalah: string
          id?: number
          kode_masalah?: string | null
        }
        Update: {
          category_id?: number | null
          deskripsi_masalah?: string
          id?: number
          kode_masalah?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problems_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "problem_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      production_problems: {
        Row: {
          id: number
          keterangan_tambahan: string | null
          problem_id: number | null
          production_id: string | null
        }
        Insert: {
          id?: number
          keterangan_tambahan?: string | null
          problem_id?: number | null
          production_id?: string | null
        }
        Update: {
          id?: number
          keterangan_tambahan?: string | null
          problem_id?: number | null
          production_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_problems_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_problems_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
        ]
      }
      productions: {
        Row: {
          course: string | null
          design_id: number | null
          final_inspection_id: number | null
          foto_after: string | null
          foto_before: string | null
          group_id: number | null
          id: string
          jml_hasil_produksi: number | null
          ket_pcs: boolean | null
          keterangan: string | null
          operator_id: number | null
          panel_no: number | null
          pcs: number | null
          pic: string | null
          potongan_ke: number | null
          rpm: number | null
          status_inspeksi: boolean | null
          tanggal_final_inspeksi: string | null
          tanggal_jam: string
          tgl: string
        }
        Insert: {
          course?: string | null
          design_id?: number | null
          final_inspection_id?: number | null
          foto_after?: string | null
          foto_before?: string | null
          group_id?: number | null
          id: string
          jml_hasil_produksi?: number | null
          ket_pcs?: boolean | null
          keterangan?: string | null
          operator_id?: number | null
          panel_no?: number | null
          pcs?: number | null
          pic?: string | null
          potongan_ke?: number | null
          rpm?: number | null
          status_inspeksi?: boolean | null
          tanggal_final_inspeksi?: string | null
          tanggal_jam?: string
          tgl?: string
        }
        Update: {
          course?: string | null
          design_id?: number | null
          final_inspection_id?: number | null
          foto_after?: string | null
          foto_before?: string | null
          group_id?: number | null
          id?: string
          jml_hasil_produksi?: number | null
          ket_pcs?: boolean | null
          keterangan?: string | null
          operator_id?: number | null
          panel_no?: number | null
          pcs?: number | null
          pic?: string | null
          potongan_ke?: number | null
          rpm?: number | null
          status_inspeksi?: boolean | null
          tanggal_final_inspeksi?: string | null
          tanggal_jam?: string
          tgl?: string
        }
        Relationships: [
          {
            foreignKeyName: "productions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_final_inspection_id_fkey"
            columns: ["final_inspection_id"]
            isOneToOne: false
            referencedRelation: "final_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
