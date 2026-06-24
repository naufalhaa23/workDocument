// === Shared Types for the Document Management System ===

export type Role = 'teknisi' | 'admin' | 'superadmin';
export type DocumentType = 'SP' | 'SPMK';
export type DocumentStatus = 'proses' | 'menunggu_izin' | 'upload_diizinkan' | 'draft_sn' | 'draft_pra' | 'assigned' | 'selesai';
export type PermissionStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType =
  | 'upload_request' | 'upload_approved' | 'upload_rejected'
  | 'inventory_request' | 'inventory_approved' | 'inventory_rejected'
  | 'deadline_warning' | 'system';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  phone_number?: string | null;
  created_at: string;
}

export interface Document {
  id: number;
  document_type: DocumentType;
  document_number: string;
  document_date: string;
  title: string;
  nama_kapal?: string | null;
  status: DocumentStatus;
  created_by: number;
  deadline_sn: string | null;
  created_at: string;
  updated_at: string;
  // Relations (populated from API)
  assignees?: { user: User }[];
  createdBy?: User;
}

export interface DocumentUpload {
  id: number;
  document_id: number;
  uploaded_by: number;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  notes: string | null;
  uploaded_at: string;
}

export interface UploadPermission {
  id: number;
  document_id: number;
  requested_by: number;
  approved_by: number | null;
  status: PermissionStatus;
  admin_notes: string | null;
  requested_at: string;
  responded_at: string | null;
  document?: Document;
  requestedBy?: User;
}

export interface InventoryItem {
  id: number;
  item_code: string;
  name: string;
  description: string | null;
  unit: string;
  stock_qty: number;
  min_stock: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryRequest {
  id: number;
  item_id: number;
  requested_by: number;
  approved_by: number | null;
  quantity: number;
  reason: string;
  status: PermissionStatus;
  admin_notes: string | null;
  requested_at: string;
  responded_at: string | null;
  item?: InventoryItem;
  requestedBy?: User;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  reference_type: string | null;
  reference_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string;
  created_at: string;
  user?: User;
}
