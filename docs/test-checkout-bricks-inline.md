# Cómo probar el checkout MP Bricks inline (Fase A)

**Rama:** `feat/mp-bricks-inline` · **Flag:** `NEXT_PUBLIC_MP_INLINE=1` · **Default:** OFF (redirect)

Objetivo del test: confirmar que el **Payment Brick embebido carga, tokeniza y
cobra en Chrome** sin el bug que forzó el redirect el 2026-05-02. Si pasa, se
encara la Fase B (precio dinámico contado vs financiado).

> El bug original era el **popup** del modal autoOpen del SDK v2 bloqueado por
> Chrome. El Brick renderiza inline (sin popup), así que probablemente no aplica
> — pero se confirma probando, no teorizando.

---

## ⚠️ Las credenciales actuales son de PRODUCCIÓN (`APP_USR-`)

Con credenciales prod, **las tarjetas de test de MP NO funcionan** (MP las
rechaza). Hay dos caminos para probar:

### Camino A — Credenciales de TEST (gratis, recomendado primero)

1. MercadoPago panel → **Tus integraciones** → la app de SC → **Credenciales de
   prueba**. Copiar el **Access Token** y la **Public Key** (ambos con prefijo
   `TEST-`).
2. Crear/usar un **usuario de prueba comprador** (panel → Cuentas de prueba).
3. Levantar el front (local o un deploy de la rama) con:
   ```
   NEXT_PUBLIC_MP_INLINE=1
   MERCADOPAGO_ACCESS_TOKEN=TEST-...
   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-...
   ```
   > Ojo: el webhook y el cobro usan `MERCADOPAGO_ACCESS_TOKEN`. Si lo ponés en
   > TEST, las órdenes de ese entorno se cobran contra la cuenta de prueba.
   > **No mezclar con la base de WP de producción** — usar un WP de staging o
   > asumir que quedan órdenes de prueba en prod (borrables).
4. Pagar con una **tarjeta de test** (abajo).

### Camino B — Tarjeta real en prod (validación definitiva)

Con las creds prod actuales + `NEXT_PUBLIC_MP_INLINE=1`, hacer **un pago real con
tarjeta propia por un monto chico** (ej. un producto barato o crear uno de $100),
y luego **reembolsarlo** desde el panel MP. Esto valida la config prod real
(incluido el comportamiento de Chrome en el dominio productivo). Cuesta la
comisión MP del movimiento.

---

## Tarjetas de prueba (solo Camino A, creds TEST)

| Tarjeta | Número | CVV | Venc. |
|---|---|---|---|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/30 |
| Visa | 4509 9535 6623 3704 | 123 | 11/30 |
| Amex | 3711 803032 57522 | 1234 | 11/30 |

**Forzar el resultado** con el NOMBRE del titular:
- `APRO` → aprobado · `OTHE` → rechazado (error general) · `CONT` → pendiente
- `FUND` → fondos insuficientes · `SECU` → CVV inválido

DNI del titular: `12345678`.

---

## Checklist de verificación

Levantar con el flag y llegar al checkout con un producto en el carrito:

- [ ] Al apretar **"Finalizar compra"** con MercadoPago elegido, **NO** redirige
      a mercadopago.com — aparece un **overlay con el formulario de tarjeta** sobre
      el sitio.
- [ ] El formulario del Brick **carga bien en Chrome** (no se queda en blanco, no
      hay popup bloqueado, no errores en consola del SDK).
- [ ] Se ve el **monto correcto** arriba del overlay y las **cuotas** ofrecidas
      coinciden con el plan SI del producto.
- [ ] Pago `APRO` → redirige a `/pedido-confirmado` y la orden pasa a
      **processing** (lo hace el webhook; puede tardar unos segundos).
- [ ] Pago `OTHE`/rechazado → muestra mensaje de error en es-AR y **deja
      reintentar** sin crear otra orden.
- [ ] **No se generan órdenes duplicadas** al reintentar (dedup por cart hash).
- [ ] Probar también en **Chrome incógnito** (el bug original tenía que ver con
      third-party cookies en incógnito).

Si todo pasa → avisar y arrancamos Fase B (cuotas con interés / precio dinámico).
Si el Brick falla en Chrome → el feature queda bloqueado por MP, dejar el flag OFF
(el redirect sigue intacto) y reportar el error de consola.

---

## Para apagarlo / revertir

- **Apagar:** quitar `NEXT_PUBLIC_MP_INLINE` (o ponerlo en `0`) y redeploy → vuelve
  el redirect, sin tocar código.
- **Revertir del todo:** no mergear la rama, o `git branch -D feat/mp-bricks-inline`.
