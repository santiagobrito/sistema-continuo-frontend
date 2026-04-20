/**
 * Tipos del API Correo Argentino PAQ.AR v2.
 * Fuente: clientes/sistema-continuo/apiPaqAr-v2.md
 */

export type DeliveryType = "homeDelivery" | "agency" | "locker";

export type ProvinceCode =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"
  | "J" | "K" | "L" | "M" | "N" | "P" | "Q" | "R"
  | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z";

export interface PaqarAddress {
  streetName: string;
  streetNumber: string;
  cityName: string;
  floor?: string;
  department?: string;
  state: ProvinceCode;
  zipCode: string;
}

/**
 * IMPORTANTE: senderData y shippingData usan schemas DISTINTOS del lado de CA:
 * - senderData acepta: businessName, id, email, teléfonos, address, observation
 *   (NO acepta `name`).
 * - shippingData acepta: name, email, teléfonos, address, observation
 *   (NO acepta `businessName` ni `id`).
 * Ambos comparten este interface con todos opcionales; el adapter rellena según
 * el contexto. Ver adapter.ts:buildShippingData() y sender.ts:getSenderData().
 */
export interface PaqarPerson {
  id?: string;
  businessName?: string;
  name?: string;
  areaCodePhone?: string;
  phoneNumber?: string;
  areaCodeCellphone?: string;
  cellphoneNumber?: string;
  email?: string;
  observation?: string;
  address: PaqarAddress;
}

export interface PaqarParcel {
  dimensions: {
    height: string;
    width: string;
    depth: string;
  };
  productWeight: string;
  productCategory?: string;
  declaredValue: string;
}

export interface PaqarCreateOrderPayload {
  sellerId?: string;
  trackingNumber?: string;
  order: {
    senderData: PaqarPerson;
    shippingData: PaqarPerson;
    parcels: PaqarParcel[];
    deliveryType: DeliveryType;
    agencyId?: string;
    saleDate: string;
    shipmentClientId?: string;
    serviceType: string;
  };
}

export interface PaqarCreateOrderResponse {
  idSeller?: string;
  trackingNumber: string;
  senderData: PaqarPerson;
  shippingData: PaqarPerson;
  parcels: PaqarParcel[];
  deliveryType: DeliveryType;
  agencyId?: string;
  saleDate: string;
  serviceType: string;
  shipmentClientId?: string;
}

export interface PaqarLabelRequest {
  sellerId?: string;
  trackingNumber: string;
}

export interface PaqarLabelResponse {
  trackingNumber: string;
  fileBase64: string;
  fileName: string;
  result: "OK" | string;
}

export interface PaqarTrackingEvent {
  facilityId?: string;
  facility: string;
  facilityCode?: string;
  statusId: string;
  status: string;
  date: string;
  sign?: string;
}

export interface PaqarTrackingResponse {
  id: string | null;
  quantity: number;
  countryId: string | null;
  serviceType: string | null;
  trackingNumber: string;
  event: PaqarTrackingEvent[];
}

export interface PaqarAgency {
  location: {
    geolocation: { latitude: string; longitude: string };
    country_name: string;
    state_name: string;
    city_name: string;
    city_id: string;
    neighborhood_name?: string;
    street_name: string;
    street_number: string;
    zip_code: string;
  };
  status: string | null;
  schedule: string;
  owner: string;
  email: string;
  phone: string;
  agency_id: string;
  agency_name: string;
  package_reception: boolean;
  pickup_availability: boolean;
  open_hours: Record<string, string | null>;
  last_updated: string | null;
  deactivation_date: string | null;
  volumetric_capacity: string | null;
  maximum_package_dimensions: {
    height: string | null;
    length: string | null;
    width: string | null;
    weight: string | null;
  };
}

export interface PaqarCancelResponse {
  codigo: number;
  mensaje: string;
}

export interface PaqarRateRequest {
  agreement?: string;
  senderData: { zipCode: string };
  shippingData: { zipCode: string };
  parcels: Array<{
    weight: number;
    dimensions: { height: number; width: number; depth: number };
    declaredValue: number;
  }>;
  deliveryType: DeliveryType;
  serviceType: string;
}

export interface PaqarRate {
  serviceName: string;
  description: string;
  serviceCode: string;
  currency: string;
  totalPrice: string;
}

export interface PaqarRateResponse {
  rates: PaqarRate[];
}

export interface PaqarApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export class PaqarApiException extends Error {
  constructor(
    public status: number,
    public body: PaqarApiError | string,
    public endpoint: string
  ) {
    super(
      `PAQ.AR ${status} on ${endpoint}: ${
        typeof body === "string" ? body : body.message || body.error
      }`
    );
    this.name = "PaqarApiException";
  }
}
