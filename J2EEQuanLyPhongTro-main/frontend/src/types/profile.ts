export interface Profile {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  cccdNumber: string | null;
  cccdFrontUrl: string | null;
  cccdBackUrl: string | null;
  bankAccount: string | null;
  bankName: string | null;
  avatarUrl: string | null;
  zaloLink: string | null;
  role: string;
  active: boolean;
  profileComplete: boolean;
  createdAt: string;
}

export interface ProfileUpdateRequest {
  fullName: string;
  phone?: string;
  cccdNumber?: string;
  cccdFrontUrl?: string;
  cccdBackUrl?: string;
  bankAccount?: string;
  bankName?: string;
  avatarUrl?: string;
  zaloLink?: string;
}
