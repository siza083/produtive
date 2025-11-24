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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string | null
          id: string
          read_at: string | null
          subtask_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          read_at?: string | null
          subtask_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          read_at?: string | null
          subtask_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          name: string | null
          photo_url: string | null
          theme: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          name?: string | null
          photo_url?: string | null
          theme?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          name?: string | null
          photo_url?: string | null
          theme?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subtask_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          subtask_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          subtask_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          subtask_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtask_assignees_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subtask_recurrences: {
        Row: {
          created_at: string
          end_date: string | null
          parent_subtask_id: string
          timezone: string | null
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          parent_subtask_id: string
          timezone?: string | null
          updated_at?: string
          weekdays: number[]
        }
        Update: {
          created_at?: string
          end_date?: string | null
          parent_subtask_id?: string
          timezone?: string | null
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "subtask_recurrences_parent_subtask_id_fkey"
            columns: ["parent_subtask_id"]
            isOneToOne: true
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean
          priority: Database["public"]["Enums"]["subtask_priority"]
          recurrence_parent_id: string | null
          status: string
          task_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          priority?: Database["public"]["Enums"]["subtask_priority"]
          recurrence_parent_id?: string | null
          status?: string
          task_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          priority?: Database["public"]["Enums"]["subtask_priority"]
          recurrence_parent_id?: string | null
          status?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          team_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invite_token: string | null
          invited_by: string | null
          invited_email: string
          role: string
          status: string | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          invited_email: string
          role?: string
          status?: string | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string
          role?: string
          status?: string | null
          team_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          invited_email: string | null
          joined_at: string | null
          permissions: Json
          role: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          invited_email?: string | null
          joined_at?: string | null
          permissions?: Json
          role?: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          invited_email?: string | null
          joined_at?: string | null
          permissions?: Json
          role?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      accept_team_invite_by_token: {
        Args: { p_token: string }
        Returns: string
      }
      add_member_by_email: {
        Args: {
          p_email: string
          p_permissions?: Json
          p_role?: string
          p_team: string
        }
        Returns: string
      }
      add_subtask_assignee: {
        Args: { p_subtask: string; p_user: string }
        Returns: undefined
      }
      check_team_admin: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      check_team_membership: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: boolean
      }
      create_team: { Args: { p_name: string }; Returns: string }
      create_team_invite: {
        Args: { p_invited_email: string; p_role: string; p_team_id: string }
        Returns: undefined
      }
      debug_auth_uid: { Args: never; Returns: string }
      debug_team_creation: {
        Args: never
        Returns: {
          current_uid: string
          is_authenticated: boolean
        }[]
      }
      debug_whoami: {
        Args: never
        Returns: {
          role: string
          tz_now: string
          uid: string
        }[]
      }
      delete_team: { Args: { p_team_id: string }; Returns: undefined }
      get_user_display_name: { Args: { user_uuid: string }; Returns: string }
      materialize_weekly_recurrences: {
        Args: { p_from: string; p_parent: string; p_to: string }
        Returns: number
      }
      my_nextweek_pending: {
        Args: { p_user?: string }
        Returns: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean
          priority: Database["public"]["Enums"]["subtask_priority"]
          recurrence_parent_id: string | null
          status: string
          task_id: string
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "subtasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      my_week_pending: {
        Args: { p_user?: string }
        Returns: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean
          priority: Database["public"]["Enums"]["subtask_priority"]
          recurrence_parent_id: string | null
          status: string
          task_id: string
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "subtasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      remove_member: {
        Args: { p_team: string; p_user: string }
        Returns: undefined
      }
      remove_subtask_assignee: {
        Args: { p_subtask: string; p_user: string }
        Returns: undefined
      }
      set_subtask_assignees: {
        Args: { p_subtask: string; p_user_ids: string[] }
        Returns: number
      }
      set_subtask_weekly_recurrence: {
        Args: {
          p_end_date?: string
          p_parent: string
          p_timezone?: string
          p_weekdays: number[]
        }
        Returns: undefined
      }
      top_up_all_recurrences: {
        Args: { p_days_ahead?: number }
        Returns: number
      }
      update_member_access: {
        Args: {
          p_permissions?: Json
          p_role?: string
          p_team: string
          p_user: string
        }
        Returns: undefined
      }
    }
    Enums: {
      subtask_priority: "low" | "medium" | "high"
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
    Enums: {
      subtask_priority: ["low", "medium", "high"],
    },
  },
} as const
