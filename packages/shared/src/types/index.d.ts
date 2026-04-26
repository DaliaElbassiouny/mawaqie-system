export declare enum TenderStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    AWARDED = "AWARDED",
    LOST = "LOST",
    CANCELLED = "CANCELLED"
}
export declare enum ProjectStatus {
    PLANNING = "PLANNING",
    ACTIVE = "ACTIVE",
    ON_HOLD = "ON_HOLD",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum PRStatus {
    DRAFT = "DRAFT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    ORDERED = "ORDERED"
}
export declare enum Language {
    AR = "ar",
    EN = "en"
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
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
export interface ClientDto {
    id: string;
    nameAr: string;
    nameEn: string | null;
    code: string;
    phone: string | null;
    email: string | null;
    isActive: boolean;
}
export interface TenderDto {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string | null;
    clientId: string;
    status: TenderStatus;
    currency: string;
    value: string | null;
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
export interface SystemSettings {
    systemNameAr: string;
    systemNameEn: string;
    defaultCurrency: string;
    defaultLanguage: Language;
    logoUrl: string | null;
    primaryColor: string;
}
//# sourceMappingURL=index.d.ts.map