// ─── Enums ───────────────────────────────────────────────────────────────────

export enum TenderStatus {
  PRICING_IN_PROGRESS = 'PRICING_IN_PROGRESS',
  PRICED_SUBMITTED = 'PRICED_SUBMITTED',
  CONTRACTED = 'CONTRACTED',
  LOST = 'LOST',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PRStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  ORDERED = 'ORDERED',
}

export enum Language {
  AR = 'ar',
  EN = 'en',
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  nameAr: string;
  nameEn: string | null;
  roles: string[];
  permissions: string[];
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export interface RoleDto {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  module: string;
  action: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  nameAr: string;
  nameEn: string | null;
  phone: string | null;
  isActive: boolean;
  roles: RoleDto[];
  createdAt: string;
  updatedAt: string;
}

// ─── Entities (lightweight) ───────────────────────────────────────────────────

export interface ClientDto {
  id: string;
  nameAr: string;
  nameEn: string | null;
  code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenderDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  clientId: string;
  status: TenderStatus;
  location: string | null;
  projectType: string | null;
  leadSource: string | null;
  currency: string;
  estimatedValue: string | null;
  submittedValue: string | null;
  bidReceiptDate: string | null;
  dueDate: string | null;
  submittedAt: string | null;
  awardedAt: string | null;
  bidResult: string | null;
  assignedEngineer: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; code: string; nameAr: string; nameEn: string | null };
}

export interface ProjectDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  companyCode: string | null;
  currency: string;
  status: ProjectStatus;
  contractValue: string | null;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SystemSettings {
  systemNameAr: string;
  systemNameEn: string;
  defaultCurrency: string;
  defaultLanguage: Language;
  logoUrl: string | null;
  primaryColor: string;
}
