import { v4 as uuidv4 } from 'uuid'

// UUID helper for frontend type generation
export const generateUUID = (): string => uuidv4()

// ============================================================================
// REGATTA ENTITY (aligned with backend/models.py Regatta model)
// ============================================================================

export interface Regatta {
  id: string // UUID in backend
  name: string
  code: string // Event code for scoring (unique identifier)
  organizer_id: string // UUID of organizing club
  start_date: string // ISO datetime
  end_date: string // ISO datetime
  latitude?: number
  longitude?: number
  scoring_class: string // e.g., "ORC", "IRC"
  status: 'planning' | 'open' | 'closed' | 'active' | 'completed'
  created_at?: string
}

// ============================================================================
// REGISTRATION ENTITY (aligned with backend/models.py Registration model)
// ============================================================================

export interface Registration {
  id: string // UUID in backend
  regatta_id: string // UUID of regatta
  user_id: string // UUID of the sailor who registered
  boat_class: string // e.g., "Olympic Class", "J/70"
  hull_number?: string
  sail_number: string
  skipper_name: string
  crew_names?: string // JSON array as string
  signature_hash: string // SHA-256 hash of signed document (eIDAS compliant)
  signature_timestamp?: string
  signature_certificate?: string // Base64 encoded cert
  registration_fee: number
  payment_status: 'pending' | 'paid' | 'refunded'
  status: 'draft' | 'submitted' | 'confirmed' | 'cancelled'
  created_at?: string
  updated_at?: string
}

// ============================================================================
// CREW MEMBER (frontend-only entity for registration form)
// ============================================================================

export interface CrewMember {
  id?: string // UUID in backend
  name: string
  email: string
  phone: string
  role: string // skipper, crew, tactician, helm, grinder
  certifications: string[]
}

// ============================================================================
// RATING CERTIFICATE (for ORC/IRC rating lookup)
// ============================================================================

export interface RatingCertificate {
  sail_number: string
  orc_rating?: number
  irc_rating?: number
  phrf_handicap?: number
  certificate_url?: string
  issued_date?: string
}

// ============================================================================
// REGISTRATION PAYMENT (aligned with backend/models.py PaymentTransaction)
// ============================================================================

export interface RegistrationPayment {
  id: string // UUID in backend
  registration_id: string
  user_id: string
  amount: number
  payment_method: 'stripe' | 'apple_pay' | 'google_pay' | 'bank_transfer'
  status: 'pending' | 'success' | 'failed' | 'refunded'
  transaction_date?: string
  created_at?: string
}

// ============================================================================
// REGISTRATION STATUS (for checking registration state)
// ============================================================================

export interface RegistrationStatus {
  id: string
  regatta_id: string
  user_id: string
  boat_class: string
  sail_number: string
  skipper_name: string
  crew_count: number
  payment_status: 'pending' | 'paid' | 'refunded'
  status: 'draft' | 'submitted' | 'confirmed' | 'cancelled'
  created_at: string
}

// ============================================================================
// REGATTA LIST (for dashboard/regatta listing)
// ============================================================================

export interface RegattaListItem {
  id: string
  name: string
  code: string
  organizer_id: string
  start_date: string
  end_date: string
  scoring_class: string
  status: 'planning' | 'open' | 'closed' | 'active' | 'completed'
}

// ============================================================================
// API RESPONSE TYPES (aligned with backend response schemas)
// ============================================================================

export interface RegattaApiResponse {
  regatta: Regatta
}

export interface RegistrationsApiResponse {
  registrations: Registration[]
  total: number
}

export interface RatingLookupResponse {
  sail_number: string
  rating?: number
  certificate_url?: string
  error?: string
}

export interface CertificateUploadResponse {
  url: string
  filename: string
  file_size: number
  content_type: string
}

export interface PaymentResponse {
  status: 'success' | 'failed'
  transaction_id: string
  amount: number
  currency: string
}