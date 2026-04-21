import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad de Sistema Continuo en el tratamiento de datos personales conforme a la Ley 25.326.",
};

export default function PrivacyPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Política de Privacidad</span>
        </nav>

        <article className="bg-white rounded-xl border border-gray-100 p-8 prose prose-sm max-w-none prose-headings:text-[#013d5a] prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:my-3 prose-li:text-gray-700">
          <h1>Política de Privacidad</h1>
          <p className="text-xs text-gray-500 -mt-4">Última actualización: 21 de abril de 2026</p>

          <h2>1. Responsable del tratamiento</h2>
          <p>
            <strong>SISTEMA CONTINUO SOCIEDAD DE HECHO</strong> (CUIT 30-71126591-7), con domicilio en
            Av. Rivadavia 17002, Haedo, Provincia de Buenos Aires, República Argentina (en adelante,
            “Sistema Continuo”, “nosotros” o “la empresa”), es responsable del tratamiento de los
            datos personales que se recolectan a través de este sitio web.
          </p>
          <p>
            Consultas sobre privacidad: <a href="mailto:info@sistemacontinuo.com.ar">info@sistemacontinuo.com.ar</a>.
          </p>

          <h2>2. Datos que recolectamos</h2>
          <ul>
            <li>Datos identificatorios: nombre, apellido, DNI o CUIT.</li>
            <li>Datos de contacto: email, teléfono, domicilio.</li>
            <li>Datos transaccionales: historial de pedidos, preferencias de productos, medios de pago utilizados (nunca almacenamos el número completo de tarjeta; el procesamiento lo realiza MercadoPago).</li>
            <li>Datos de navegación: dirección IP, cookies, páginas visitadas, dispositivo y navegador.</li>
          </ul>

          <h2>3. Finalidades</h2>
          <ul>
            <li>Procesar y entregar tus pedidos.</li>
            <li>Emitir facturación conforme normativa AFIP.</li>
            <li>Comunicaciones transaccionales (confirmación, estado de envío, incidencias).</li>
            <li>Comunicaciones comerciales (ofertas, novedades) cuando el titular las haya aceptado. Podés cancelar la suscripción en cualquier momento desde el pie de cada email.</li>
            <li>Prevención de fraude y cumplimiento legal.</li>
            <li>Mejora del servicio y análisis estadístico.</li>
          </ul>

          <h2>4. Base legal</h2>
          <p>
            El tratamiento se fundamenta en: (a) la ejecución del contrato de compraventa;
            (b) el cumplimiento de obligaciones legales (facturación, garantías, registros comerciales);
            (c) el consentimiento del titular para comunicaciones comerciales; (d) el interés legítimo
            de la empresa para prevención de fraude y seguridad.
          </p>

          <h2>5. Terceros que procesan tus datos</h2>
          <p>
            Contratamos proveedores que acceden a datos personales únicamente para prestar servicios
            en nuestro nombre, bajo obligaciones contractuales de confidencialidad y seguridad:
          </p>
          <ul>
            <li><strong>MercadoPago</strong> (procesamiento de pagos).</li>
            <li><strong>Correo Argentino</strong> (envíos a domicilio o sucursal).</li>
            <li><strong>Brevo</strong> (emails transaccionales y comerciales).</li>
            <li><strong>Google</strong> (análisis de tráfico, publicidad y autenticación).</li>
            <li>Proveedores de hosting y seguridad informática.</li>
          </ul>
          <p>
            No vendemos, alquilamos ni cedemos tus datos a terceros con fines distintos a los
            indicados, salvo obligación legal o requerimiento judicial.
          </p>

          <h2>6. Conservación</h2>
          <p>
            Conservamos los datos por el tiempo necesario para cumplir las finalidades descritas y,
            en particular, durante el plazo que exige la normativa contable, fiscal y comercial
            argentina (mínimo 10 años para documentación de operaciones). Pasado ese plazo, los datos
            son eliminados o anonimizados.
          </p>

          <h2>7. Derechos del titular</h2>
          <p>
            Conforme a la Ley 25.326 de Protección de Datos Personales, podés ejercer los derechos
            de acceso, rectificación, actualización, supresión y oposición al tratamiento, enviando
            un correo a <a href="mailto:info@sistemacontinuo.com.ar">info@sistemacontinuo.com.ar</a>,
            acompañando copia del DNI que acredite tu identidad.
          </p>
          <p>
            Responderemos tu solicitud dentro de los 10 días corridos de recibida, conforme al
            artículo 14 inc. 2 de la Ley 25.326. Las solicitudes reiteradas, abusivas o infundadas
            podrán ser rechazadas o sujetas a costos operativos razonables.
          </p>
          <p>
            La Agencia de Acceso a la Información Pública (AAIP), Órgano de Control de la Ley 25.326,
            tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten
            afectados en sus derechos por incumplimiento de las normas vigentes en materia de
            protección de datos personales.
          </p>

          <h2>8. Cookies</h2>
          <p>
            Utilizamos cookies propias y de terceros para: mantener la sesión, recordar preferencias,
            analizar tráfico (Google Analytics), personalizar publicidad (Google Ads, Meta) y medir
            conversiones. Al continuar navegando aceptás su uso. Podés desactivarlas desde la
            configuración de tu navegador, con eventual pérdida de funcionalidad del sitio.
          </p>

          <h2>9. Seguridad</h2>
          <p>
            Implementamos medidas técnicas y organizativas razonables para proteger los datos frente
            a accesos no autorizados, pérdida o alteración. Ninguna transmisión electrónica es 100%
            segura: el titular asume los riesgos inherentes al uso de Internet.
          </p>

          <h2>10. Menores</h2>
          <p>
            El sitio está dirigido a mayores de 18 años. No recolectamos deliberadamente datos de
            menores. Si detectamos que recolectamos datos de un menor sin autorización, los
            eliminaremos al tomar conocimiento.
          </p>

          <h2>11. Modificaciones</h2>
          <p>
            Podemos modificar esta Política en cualquier momento. Las modificaciones entran en
            vigencia desde su publicación en el sitio. Recomendamos revisarla periódicamente.
          </p>

          <h2>12. Jurisdicción</h2>
          <p>
            Esta Política se rige por las leyes de la República Argentina. Cualquier controversia
            será sometida a los Tribunales Ordinarios del Departamento Judicial de Morón, sin
            perjuicio de las normas de orden público aplicables en materia de consumo.
          </p>
        </article>
      </div>
    </main>
  );
}
