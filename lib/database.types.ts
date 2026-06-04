export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      customers: {
        Row: {
          billing_address: string | null
          created_at: string
          credit_limit: number
          email: string | null
          gstin: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_by: string | null
          id: string
          moved_at: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string | null
          organization_id: string
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          warehouse_id: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          moved_at?: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          organization_id: string
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id: string
        }
        Update: {
          created_by?: string | null
          id?: string
          moved_at?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          gst_rate: number
          id: string
          invoice_id: string
          line_total: number
          organization_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          gst_rate: number
          id?: string
          invoice_id: string
          line_total: number
          organization_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          gst_rate?: number
          id?: string
          invoice_id?: string
          line_total?: number
          organization_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number
          cgst: number
          created_at: string
          customer_id: string | null
          due_date: string | null
          id: string
          igst: number
          invoice_date: string
          invoice_number: string
          invoice_type: string
          organization_id: string
          sgst: number
          status: Database["public"]["Enums"]["document_status"]
          subtotal: number
          total: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          balance_due?: number
          cgst?: number
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          igst?: number
          invoice_date?: string
          invoice_number: string
          invoice_type: string
          organization_id: string
          sgst?: number
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          balance_due?: number
          cgst?: number
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          igst?: number
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          organization_id?: string
          sgst?: number
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          currency: string
          gstin: string | null
          id: string
          name: string
          state_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          gstin?: string | null
          id?: string
          name: string
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          gstin?: string | null
          id?: string
          name?: string
          state_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          method: string
          organization_id: string
          payment_date: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          organization_id: string
          payment_date?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          organization_id?: string
          payment_date?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          gst_rate: number
          hsn_sac: string | null
          id: string
          name: string
          organization_id: string
          purchase_price: number
          reorder_level: number
          sales_price: number
          sku: string
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          gst_rate?: number
          hsn_sac?: string | null
          id?: string
          name: string
          organization_id: string
          purchase_price?: number
          reorder_level?: number
          sales_price?: number
          sku: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          gst_rate?: number
          hsn_sac?: string | null
          id?: string
          name?: string
          organization_id?: string
          purchase_price?: number
          reorder_level?: number
          sales_price?: number
          sku?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          gst_rate: number
          id: string
          line_total: number
          organization_id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          gst_rate: number
          id?: string
          line_total: number
          organization_id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          gst_rate?: number
          id?: string
          line_total?: number
          organization_id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          cgst: number
          created_at: string
          id: string
          igst: number
          order_date: string
          order_number: string
          organization_id: string
          sgst: number
          status: Database["public"]["Enums"]["document_status"]
          subtotal: number
          total: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          cgst?: number
          created_at?: string
          id?: string
          igst?: number
          order_date?: string
          order_number: string
          organization_id: string
          sgst?: number
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          cgst?: number
          created_at?: string
          id?: string
          igst?: number
          order_date?: string
          order_number?: string
          organization_id?: string
          sgst?: number
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          gst_rate: number
          id: string
          line_total: number
          organization_id: string
          product_id: string
          quantity: number
          sales_order_id: string
          unit_price: number
        }
        Insert: {
          gst_rate: number
          id?: string
          line_total: number
          organization_id: string
          product_id: string
          quantity: number
          sales_order_id: string
          unit_price: number
        }
        Update: {
          gst_rate?: number
          id?: string
          line_total?: number
          organization_id?: string
          product_id?: string
          quantity?: number
          sales_order_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          cgst: number
          created_at: string
          customer_id: string
          id: string
          igst: number
          order_date: string
          order_number: string
          organization_id: string
          sgst: number
          status: Database["public"]["Enums"]["document_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cgst?: number
          created_at?: string
          customer_id: string
          id?: string
          igst?: number
          order_date?: string
          order_number: string
          organization_id: string
          sgst?: number
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cgst?: number
          created_at?: string
          customer_id?: string
          id?: string
          igst?: number
          order_date?: string
          order_number?: string
          organization_id?: string
          sgst?: number
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          billing_address: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          state_code: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          state_code?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          state_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: {
          organization_gstin?: string
          organization_name: string
          organization_state_code?: string
        }
        Returns: {
          created_at: string
          currency: string
          gstin: string | null
          id: string
          name: string
          state_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_org_admin: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
    }
    Enums: {
      document_status:
        | "draft"
        | "sent"
        | "approved"
        | "received"
        | "invoiced"
        | "paid"
        | "cancelled"
      inventory_movement_type:
        | "purchase_receipt"
        | "sale_issue"
        | "adjustment"
        | "transfer"
      member_role: "owner" | "admin" | "manager" | "staff"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      document_status: [
        "draft",
        "sent",
        "approved",
        "received",
        "invoiced",
        "paid",
        "cancelled",
      ],
      inventory_movement_type: [
        "purchase_receipt",
        "sale_issue",
        "adjustment",
        "transfer",
      ],
      member_role: ["owner", "admin", "manager", "staff"],
    },
  },
} as const

