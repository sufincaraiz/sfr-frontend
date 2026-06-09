export type PropertyStatus = 'available' | 'reserved' | 'sold';
export type PropertyType = 'finca' | 'lote' | 'casa' | 'apartamento' | 'condominio' | 'local';
export type Tour360Type = 'self_hosted' | 'embed';

export interface Municipality {
  id: string;
  slug: string;
  name: string;
  province: string;
  demand_score: number;
}

export interface Vereda {
  id: string;
  slug: string;
  name: string;
  municipality_id: string;
  lat: number | null;
  lng: number | null;
  municipality?: Municipality;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  license: string | null;
  whatsapp: string;
  email: string;
}

export interface PropertyMedia {
  id: string;
  property_id: string;
  type: 'image' | 'video' | 'tour360';
  tour360_type: Tour360Type | null;
  tour360_embed_url: string | null;
  url: string;
  order: number;
  alt_text: string;
  is_primary: boolean;
}

export interface Property {
  id: string;
  slug: string;
  type: PropertyType;
  transaction_type: 'venta';
  municipality_id: string;
  vereda_id: string | null;
  address_visible: string | null;
  price_cop: number;
  area_lot_m2: number | null;
  area_built_m2: number | null;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  year_built: number | null;
  status: PropertyStatus;
  geo_lat: number | null;
  geo_lng: number | null;
  published_at: string;
  updated_at: string;
  // Relations
  municipality?: Municipality;
  vereda?: Vereda;
  media?: PropertyMedia[];
  features?: PropertyFeature[];
  // Computed from CMS
  title?: string;
  short_description?: string;
  meta_title?: string;
  meta_description?: string;
}

export interface PropertyFeature {
  property_id: string;
  feature_key: string;
  feature_value: string;
}

export interface Lead {
  id: string;
  property_id: string | null;
  name: string;
  phone: string;
  email: string;
  channel: string;
  message: string | null;
  utm_source: string | null;
  created_at: string;
  status: string;
  assigned_agent_id: string | null;
}

export interface SearchParams {
  tipo?: PropertyType;
  municipio?: string;
  precio_min?: number;
  precio_max?: number;
  page?: number;
}
