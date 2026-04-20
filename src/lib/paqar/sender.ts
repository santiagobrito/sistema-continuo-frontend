/**
 * Datos del remitente (Sistema Continuo) para cada orden PAQ.AR.
 * Se pueden sobreescribir por env vars. Valores default = los del local de Haedo.
 */

import type { PaqarPerson, ProvinceCode } from "./types";

export function getSenderData(): PaqarPerson {
  return {
    businessName: process.env.PAQAR_SENDER_NAME || "Sistema Continuo",
    // id es un ID NUMÉRICO interno de CA (no es el CUIT). Lo provee el comercial
    // al dar de alta el acuerdo. Si está seteado via PAQAR_SENDER_ID lo usamos;
    // si no, lo omitimos (CA usa el senderData default del acuerdo).
    ...(process.env.PAQAR_SENDER_ID ? { id: process.env.PAQAR_SENDER_ID } : {}),
    areaCodePhone: process.env.PAQAR_SENDER_PHONE_AREA || "011",
    phoneNumber: process.env.PAQAR_SENDER_PHONE || "46501592",
    areaCodeCellphone: process.env.PAQAR_SENDER_CEL_AREA || "011",
    cellphoneNumber: process.env.PAQAR_SENDER_CEL || "30793862",
    email: process.env.PAQAR_SENDER_EMAIL || "ventas@sistemacontinuo.com.ar",
    observation: "",
    address: {
      streetName: process.env.PAQAR_SENDER_STREET || "Av. Rivadavia",
      streetNumber: process.env.PAQAR_SENDER_NUMBER || "17002",
      cityName: process.env.PAQAR_SENDER_CITY || "Haedo",
      state: (process.env.PAQAR_SENDER_STATE || "B") as ProvinceCode,
      zipCode: process.env.PAQAR_SENDER_ZIP || "1706",
      // CA renderiza literal "null" en el rótulo cuando floor/department vienen
      // ausentes — mandamos string vacío explícito para que no aparezca.
      floor: "",
      department: "",
    },
  };
}
