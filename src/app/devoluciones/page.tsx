import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cambios y Devoluciones",
  description: "Política de cambios, devoluciones y garantía legal en Sistema Continuo.",
};

export default function ReturnsPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Cambios y Devoluciones</span>
        </nav>

        <article className="bg-white rounded-xl border border-gray-100 p-8 prose prose-sm max-w-none prose-headings:text-[#013d5a] prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:my-3 prose-li:text-gray-700">
          <h1>Política de Cambios y Devoluciones</h1>
          <p className="text-xs text-gray-500 -mt-4">Última actualización: 21 de abril de 2026</p>

          <h2>1. Derecho de revocación (arrepentimiento)</h2>
          <p>
            Conforme al artículo 34 de la Ley 24.240 de Defensa del Consumidor, tenés derecho a
            revocar la compra dentro de los <strong>10 (diez) días corridos</strong> contados
            desde la entrega efectiva del producto.
          </p>
          <p>
            Para ejercer este derecho enviá un email a{" "}
            <a href="mailto:ventas@sistemacontinuo.com.ar">ventas@sistemacontinuo.com.ar</a>{" "}
            dentro del plazo indicando: número de pedido, producto, motivo y DNI/CUIT del titular.
            Fuera de ese plazo no se aceptan devoluciones por arrepentimiento.
          </p>

          <h2>2. Condiciones para la devolución</h2>
          <p>Para que la devolución sea procedente, el producto debe:</p>
          <ul>
            <li>Estar <strong>sin uso</strong>, sin señales de haber sido probado, instalado o conectado.</li>
            <li>Conservar el <strong>embalaje original cerrado</strong>, precintos, etiquetas, blisters y accesorios.</li>
            <li>Incluir todos los accesorios, manuales, cables, garantías impresas y obsequios promocionales.</li>
            <li>Presentar la <strong>factura original</strong> o comprobante de compra.</li>
            <li>No presentar rayones, golpes, manchas, olores ni otro daño.</li>
          </ul>
          <p>
            Sistema Continuo se reserva el derecho de rechazar la devolución si el producto no
            cumple con estas condiciones, o de aplicar un descuento proporcional al deterioro
            detectado respecto del valor a reintegrar.
          </p>

          <h2>3. Productos excluidos del derecho de revocación</h2>
          <p>
            De conformidad con el artículo 34 inc. “b” de la Ley 24.240 y por razones de higiene,
            originalidad o personalización, <strong>no se aceptan devoluciones</strong> de:
          </p>
          <ul>
            <li>Productos personalizados, confeccionados o impresos a medida o pedido del cliente.</li>
            <li>Tintas, papeles, cintas, vinilos, consumibles y productos similares cuyo envoltorio, blister o precinto haya sido abierto.</li>
            <li>Productos que, por su naturaleza, no puedan ser devueltos sin riesgo de contaminación o deterioro técnico.</li>
            <li>Software, licencias, códigos de activación o productos digitales ya descargados o activados.</li>
            <li>Productos adquiridos bajo pedido especial al proveedor.</li>
            <li>Productos en liquidación o promocionados expresamente como “sin cambio” al momento de la compra.</li>
            <li>Repuestos y accesorios que, por su instalación, no puedan ser devueltos en estado original.</li>
          </ul>

          <h2>4. Costos de envío de la devolución</h2>
          <p>
            El <strong>costo del envío de retorno está a cargo del comprador</strong>, conforme se
            informa en estos términos de compra, que el consumidor acepta al confirmar el pedido.
            Sistema Continuo no se hace cargo de fletes de devolución por arrepentimiento.
          </p>
          <p>
            La única excepción es la devolución por <strong>defecto de fabricación</strong>{" "}
            comprobado, en cuyo caso asumimos el flete. Ver sección 7 (Garantía).
          </p>

          <h2>5. Procedimiento</h2>
          <ol>
            <li>Solicitá autorización enviando email a <a href="mailto:ventas@sistemacontinuo.com.ar">ventas@sistemacontinuo.com.ar</a>.</li>
            <li>Recibirás número de autorización de devolución (RMA) y las instrucciones de envío.</li>
            <li>Enviá el producto a nuestro domicilio con el RMA visible en el paquete. No se aceptan devoluciones sin autorización previa.</li>
            <li>Al recibir el producto, lo inspeccionamos dentro de los <strong>10 días hábiles</strong> para verificar el cumplimiento de las condiciones.</li>
            <li>Si la devolución es aceptada, procedemos al reintegro. Si es rechazada, el producto queda a disposición del cliente para su retiro o reenvío por su cuenta.</li>
          </ol>

          <h2>6. Reintegro del importe</h2>
          <p>
            Una vez aceptada la devolución, el reintegro se efectuará dentro de los{" "}
            <strong>30 (treinta) días hábiles</strong> desde la recepción conforme del producto.
          </p>
          <p>
            El reintegro se realizará por el mismo medio de pago utilizado en la compra siempre que
            sea técnicamente posible:
          </p>
          <ul>
            <li><strong>MercadoPago / tarjeta:</strong> reversa a la tarjeta original (el plazo de acreditación efectiva depende del banco emisor y puede extenderse 1 a 2 ciclos de liquidación).</li>
            <li><strong>Transferencia bancaria:</strong> transferencia a la misma cuenta de origen.</li>
            <li><strong>Efectivo en local:</strong> reintegro mediante transferencia bancaria a la cuenta del titular de la factura.</li>
          </ul>
          <p>
            Sistema Continuo no reintegra en efectivo ni emite nota de crédito salvo solicitud
            expresa del cliente. No se reintegran los costos de envío originales abonados, salvo
            defecto de fabricación.
          </p>

          <h2>7. Garantía por defecto de fabricación</h2>
          <p>
            Los productos nuevos gozan de la garantía legal mínima de <strong>seis (6) meses</strong>{" "}
            desde la entrega (Ley 24.240, arts. 11-18). La garantía cubre exclusivamente defectos
            de origen del fabricante.
          </p>
          <p><strong>No están cubiertos por la garantía:</strong></p>
          <ul>
            <li>Daños por golpes, caídas, humedad, sobretensiones eléctricas o instalación incorrecta.</li>
            <li>Mal uso o uso fuera de las indicaciones del fabricante.</li>
            <li>Modificaciones, reparaciones o intervenciones por personal no autorizado.</li>
            <li>Uso de repuestos, accesorios o insumos no originales.</li>
            <li>Desgaste normal por uso (gomas, resistencias, cabezales con ciclos de vida definidos).</li>
            <li>Consumibles: tintas, papeles, cintas, cintas teflonadas, siliconas y accesorios de recambio periódico.</li>
            <li>Productos con número de serie removido, alterado o ilegible.</li>
          </ul>
          <p><strong>Procedimiento para garantía:</strong></p>
          <ol>
            <li>Enviá consulta técnica con foto/video de la falla a <a href="mailto:ventas@sistemacontinuo.com.ar">ventas@sistemacontinuo.com.ar</a>.</li>
            <li>Nuestro equipo técnico evalúa el caso. Si corresponde, autorizamos el envío del producto a nuestro domicilio para evaluación.</li>
            <li>El producto debe enviarse con factura original. El flete inicial es a cargo del cliente.</li>
            <li>Evaluación técnica dentro de los 10 a 15 días hábiles de recibido.</li>
            <li>Si se confirma defecto de fabricación, procedemos según orden de prelación: (a) reparación; (b) cambio por producto igual; (c) cambio por producto similar de igual o mayor valor; (d) reintegro del importe. La elección corresponde a Sistema Continuo. El flete de retorno al cliente queda a nuestro cargo.</li>
            <li>Si no se comprueba defecto de fabricación o se detecta mal uso, el producto se devuelve al cliente. Los costos de logística serán a su cargo.</li>
          </ol>

          <h2>8. Diferencias en el pedido recibido</h2>
          <p>
            Si al recibir el pedido detectás faltantes, producto equivocado o daños visibles en el
            embalaje, debés notificarlo por email dentro de las <strong>48 horas hábiles</strong>{" "}
            siguientes a la recepción, adjuntando fotos del paquete y del producto. Pasado ese
            plazo, se presume que el pedido se recibió conforme y no se admiten reclamos por estos
            conceptos.
          </p>

          <h2>9. Autoridad de aplicación</h2>
          <p>
            En caso de reclamo que no pueda resolverse directamente, el consumidor puede acudir al
            Servicio de Conciliación Previa en las Relaciones de Consumo (COPREC) o a la
            Subsecretaría de Defensa del Consumidor de la Nación. Más información:{" "}
            <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noopener noreferrer">argentina.gob.ar/produccion/defensadelconsumidor</a>.
          </p>
        </article>
      </div>
    </main>
  );
}
