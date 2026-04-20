/**
 * Datos del remitente (Sistema Continuo) para cada orden PAQ.AR.
 * Se pueden sobreescribir por env vars. Valores default = los del local de Haedo.
 */

import type { PaqarPerson, ProvinceCode } from "./types";

export function getSenderData(): PaqarPerson {
  return {
    businessName: process.env.PAQAR_SENDER_NAME || "Sistema Continuo",
    // CUIT del remitente sin guiones. El manual no aclara si es obligatorio
    // pero CA puede requerirlo internamente para validar la pieza.
    id: process.env.PAQAR_SENDER_CUIT || "30711265917",
    areaCodePhone: process.env.PAQAR_SENDER_PHONE_AREA || "011",
    phoneNumber: process.env.PAQAR_SENDER_PHONE || "46501592",
    areaCodeCellphone: process.env.PAQAR_SENDER_CEL_AREA || "011",
    cellphoneNumber: process.env.PAQAR_SENDER_CEL || "30793862",
    email: process.env.PAQAR_SENDER_EMAIL || "ventas@sistemacontinuo.com.ar",
    address: {
      streetName: process.env.PAQAR_SENDER_STREET || "Av. Rivadavia",
      streetNumber: process.env.PAQAR_SENDER_NUMBER || "17002",
      cityName: process.env.PAQAR_SENDER_CITY || "Haedo",
      state: (process.env.PAQAR_SENDER_STATE || "B") as ProvinceCode,
      zipCode: process.env.PAQAR_SENDER_ZIP || "1706",
    },
  };
}
