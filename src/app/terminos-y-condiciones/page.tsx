import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones generales de compra en Sistema Continuo.",
};

export default function TermsPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Términos y Condiciones</span>
        </nav>

        <article className="bg-white rounded-xl border border-gray-100 p-8 prose prose-sm max-w-none prose-headings:text-[#013d5a] prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:my-3 prose-li:text-gray-700">
          <h1>Términos y Condiciones</h1>
          <p className="text-xs text-gray-500 -mt-4">Última actualización: 21 de abril de 2026</p>

          <h2>1. Identificación del vendedor</h2>
          <p>
            El sitio <strong>sistemacontinuo.com.ar</strong> es operado por{" "}
            <strong>SISTEMA CONTINUO SOCIEDAD DE HECHO</strong> (CUIT 30-71126591-7), con domicilio
            comercial en Av. Rivadavia 17002, Haedo (1706), Provincia de Buenos Aires, República
            Argentina (en adelante, “Sistema Continuo”). Correo de contacto:{" "}
            <a href="mailto:ventas@sistemacontinuo.com.ar">ventas@sistemacontinuo.com.ar</a>.
          </p>

          <h2>2. Aceptación</h2>
          <p>
            El uso del sitio y la realización de compras implican la aceptación íntegra y sin
            reservas de estos Términos y Condiciones, de la{" "}
            <Link href="/politica-de-privacidad">Política de Privacidad</Link> y de la{" "}
            <Link href="/devoluciones">Política de Cambios y Devoluciones</Link>. Si no estás de
            acuerdo, no utilices el sitio.
          </p>

          <h2>3. Cuentas de usuario</h2>
          <p>
            El registro de cuenta requiere datos veraces y actualizados. El usuario es el único
            responsable por la confidencialidad de sus credenciales y por toda actividad realizada
            desde su cuenta. Sistema Continuo puede suspender o eliminar cuentas que presenten
            indicios de fraude, uso indebido, violación de estos términos o inactividad prolongada,
            sin previo aviso ni obligación de reintegro de saldos o beneficios.
          </p>

          <h2>4. Productos, precios y disponibilidad</h2>
          <p>
            Los precios están expresados en <strong>pesos argentinos</strong> e incluyen el IVA
            correspondiente. Los precios, las especificaciones, las imágenes y la disponibilidad de
            stock pueden modificarse en cualquier momento sin previo aviso. Las imágenes son
            ilustrativas: pueden presentar variaciones respecto del producto físico por lote,
            versión o edición.
          </p>
          <p>
            La publicación de un producto en el sitio constituye una <strong>invitación a
            ofertar</strong> y no una oferta contractual vinculante. El contrato de compraventa se
            perfecciona únicamente cuando Sistema Continuo confirma expresamente la aceptación del
            pedido tras la validación del pago y la verificación de stock. Hasta ese momento,
            podemos rechazar o cancelar el pedido sin responsabilidad, reintegrando los importes
            efectivamente abonados.
          </p>
          <p>
            En caso de errores evidentes de precio (ej.: precio notoriamente inferior al valor de
            mercado), Sistema Continuo se reserva el derecho de cancelar la operación aun cuando ya
            hubiera confirmado el pedido, reintegrando el importe percibido.
          </p>

          <h2>5. Formas de pago</h2>
          <p>
            Aceptamos los medios de pago indicados en la página de{" "}
            <Link href="/formas-de-pago">formas de pago</Link>. El procesamiento de pagos con
            tarjeta lo realiza <strong>MercadoPago</strong>; Sistema Continuo no almacena datos
            completos de tarjeta. Las transferencias bancarias deben acreditarse en nuestra cuenta
            antes del despacho del pedido; hasta tanto, el pedido permanece en espera.
          </p>

          <h2>6. Facturación</h2>
          <p>
            Sistema Continuo emite factura B por defecto (consumidor final). Para factura A, el
            comprador debe ser responsable inscripto en AFIP e informar CUIT y condición fiscal al
            momento de la compra. Las facturas se emiten únicamente al momento del pago aprobado
            y no son modificables posteriormente.
          </p>

          <h2>7. Envíos y entrega</h2>
          <p>
            Las condiciones, zonas, tiempos y costos de envío se detallan en{" "}
            <Link href="/envios">envíos</Link>. El plazo informado es estimado y puede verse
            afectado por factores ajenos a Sistema Continuo (stock del proveedor, transporte,
            clima, huelgas). Los plazos se cuentan en días hábiles.
          </p>
          <p>
            Una vez despachado el producto al operador logístico (Correo Argentino, moto o
            transporte al interior), el riesgo de pérdida, sustracción o deterioro se rige por las
            condiciones del operador contratado. El cliente es responsable de declarar una
            dirección de entrega correcta y de recibir el paquete; los costos de reenvío por
            dirección errónea o rechazo de recepción serán a su cargo.
          </p>
          <p>
            Si el pedido estuvo disponible para retiro en local o en sucursal de Correo Argentino y
            no fue retirado dentro de los 15 (quince) días corridos posteriores al aviso, se
            considerará abandonado y el importe podrá reintegrarse con descuento de los costos
            operativos incurridos (flete, almacenamiento, reempaque).
          </p>

          <h2>8. Cambios y devoluciones</h2>
          <p>
            Las condiciones completas se detallan en{" "}
            <Link href="/devoluciones">política de cambios y devoluciones</Link>.
          </p>

          <h2>9. Garantía legal</h2>
          <p>
            Los productos nuevos gozan de la garantía legal mínima de <strong>seis (6) meses</strong>{" "}
            desde su entrega efectiva, conforme a los artículos 11 a 18 de la Ley 24.240. La
            garantía cubre exclusivamente defectos de fabricación y no alcanza daños por mal uso,
            uso fuera de las indicaciones del fabricante, golpes, humedad, sobretensiones eléctricas,
            modificaciones, intervención por personal no autorizado, uso de repuestos o insumos no
            originales, desgaste normal por uso, ni consumibles (tintas, papeles, cintas, accesorios
            de uso periódico).
          </p>
          <p>
            La garantía se hace efectiva exclusivamente mediante presentación de la factura original.
            El cliente debe enviar el producto a nuestro domicilio para su evaluación técnica, siendo
            el flete de ida y vuelta a su cargo, salvo que se confirme el defecto de fabricación, en
            cuyo caso asumiremos los costos de logística.
          </p>

          <h2>10. Uso del sitio</h2>
          <p>El usuario se compromete a:</p>
          <ul>
            <li>No utilizar el sitio para fines ilícitos o no autorizados.</li>
            <li>No intentar acceder, alterar o interferir con los sistemas informáticos de Sistema Continuo.</li>
            <li>No utilizar bots, scrapers o herramientas automatizadas para extraer información del sitio.</li>
            <li>No suplantar identidad de terceros.</li>
            <li>No introducir virus, malware o código malicioso.</li>
          </ul>
          <p>
            El incumplimiento faculta a Sistema Continuo a suspender el acceso, cancelar pedidos en
            curso e iniciar las acciones legales que correspondan.
          </p>

          <h2>11. Propiedad intelectual</h2>
          <p>
            Todos los contenidos del sitio (textos, imágenes, fotografías, logos, diseño,
            descripciones, código fuente) son propiedad de Sistema Continuo o se utilizan con
            autorización de sus titulares y están protegidos por las leyes de propiedad intelectual
            vigentes. Queda prohibida su reproducción total o parcial, distribución o uso comercial
            sin autorización expresa y por escrito.
          </p>

          <h2>12. Limitación de responsabilidad</h2>
          <p>
            En la máxima medida permitida por la legislación aplicable, la responsabilidad de
            Sistema Continuo frente al usuario por cualquier concepto estará limitada al importe
            efectivamente abonado por el pedido que origina el reclamo. Sistema Continuo no será
            responsable por daños indirectos, lucro cesante, pérdida de oportunidad de negocio,
            daño reputacional ni daños morales derivados del uso del sitio o de la contratación de
            sus productos.
          </p>
          <p>
            Esta limitación no aplica a supuestos de dolo o culpa grave, ni afecta los derechos
            irrenunciables que la Ley 24.240 reconoce al consumidor.
          </p>

          <h2>13. Vínculos a sitios de terceros</h2>
          <p>
            El sitio puede contener enlaces a sitios de terceros (redes sociales, proveedores de
            pago, servicios de entrega). Sistema Continuo no controla ni se responsabiliza por el
            contenido, políticas de privacidad o prácticas de dichos sitios.
          </p>

          <h2>14. Modificaciones</h2>
          <p>
            Podemos modificar estos Términos y Condiciones en cualquier momento. Las modificaciones
            entran en vigencia desde su publicación en el sitio. El uso continuado del sitio tras
            la publicación implica aceptación de la versión vigente.
          </p>

          <h2>15. Cesión</h2>
          <p>
            Sistema Continuo puede ceder los derechos y obligaciones emergentes de estos Términos
            a terceros sin necesidad de notificación previa al usuario. El usuario no podrá ceder
            sus derechos sin consentimiento previo y por escrito de Sistema Continuo.
          </p>

          <h2>16. Legislación aplicable y jurisdicción</h2>
          <p>
            Estos Términos y Condiciones se rigen por las leyes de la República Argentina. Para
            toda controversia que no encuadre en las disposiciones de orden público de la Ley
            24.240, las partes se someten a la jurisdicción de los Tribunales Ordinarios del
            Departamento Judicial de Morón, con renuncia expresa a cualquier otro fuero que pudiera
            corresponderles.
          </p>

          <h2>17. Contacto</h2>
          <p>
            Consultas comerciales:{" "}
            <a href="mailto:ventas@sistemacontinuo.com.ar">ventas@sistemacontinuo.com.ar</a>.
            Privacidad: <a href="mailto:info@sistemacontinuo.com.ar">info@sistemacontinuo.com.ar</a>.
          </p>
        </article>
      </div>
    </main>
  );
}
