/**
 * HOJA ÚNICA PARA LLEVARLE AL CONTADOR — una página A4, para imprimir.
 *
 * Distinta del formulario largo de `/interno/datos-contador`, que explica cada
 * pregunta y se puede diligenciar en pantalla y enviar por WhatsApp. Esta es la
 * versión para la reunión: lo imprescindible, en orden de qué bloquea más, sin
 * contexto ni explicaciones, y cabe en una hoja.
 *
 * El CIIU va PRIMERO: sin él no se calcula el ICA de ningún ingreso, y los
 * cinco tipos de servicio están hoy sin asignar. Es lo único que bloquea
 * cálculos ya registrados; el resto bloquea la activación del año.
 *
 * noindex y fuera del sitemap: documento interno.
 */

const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Datos para el contador — hoja única · Su Finca Raíz</title>
<style>
  :root { --navy:#0D2D5E; --line:#CBD5E1; --muted:#475569; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         color:#0F172A; background:#F1F5F9; font-size: 10.5pt; line-height: 1.35; }
  main { max-width: 780px; margin: 0 auto; background:#fff; padding: 16px 20px; }
  header { border-bottom: 2px solid var(--navy); padding-bottom: 8px; margin-bottom: 10px; }
  h1 { font-size: 14pt; margin: 0 0 2px; color: var(--navy); }
  .sub { color: var(--muted); font-size: 9pt; }
  .meta { display:flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 9.5pt; color: var(--muted); }
  .meta b { color: var(--navy); }
  .lin { display:inline-block; border-bottom: 1px solid #94A3B8; min-width: 120px; }
  section { margin: 11px 0; break-inside: avoid; }
  h2 { font-size: 10.5pt; color: var(--navy); margin: 0 0 4px; display:flex; align-items:baseline; gap:6px; }
  h2 .n { background: var(--navy); color:#fff; width:17px; height:17px; border-radius:50%;
          display:inline-grid; place-items:center; font-size:8.5pt; flex: 0 0 auto; }
  .nota { color: var(--muted); font-size: 8.8pt; margin: 2px 0 5px; }
  table { width:100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align:left; font-size: 8pt; text-transform: uppercase; letter-spacing:.3px; color: var(--muted);
       border-bottom: 1px solid var(--line); padding: 3px 4px; font-weight: 700; }
  td { border-bottom: 1px solid #E2E8F0; padding: 5px 4px; }
  td.v { border-bottom: 1px solid #94A3B8; min-width: 70px; }
  .bloquea { background:#FEF2F2; border-left: 3px solid #B91C1C; padding: 6px 9px; font-size: 9pt; color:#7F1D1D; margin-bottom: 10px; }
  .firma { margin-top: 16px; display:flex; gap: 30px; font-size: 9pt; color: var(--muted); }
  .firma div { flex:1; border-top: 1px solid #94A3B8; padding-top: 3px; }
  @page { size: A4; margin: 12mm; }
  @media print { body { background:#fff; font-size: 9.5pt; } main { max-width:none; padding:0; } }
</style>
</head>
<body>
<main>
  <header>
    <h1>Datos que necesitamos del contador</h1>
    <div class="sub">Su Finca Raíz · Matrícula mercantil 199483 · La Vega, Cundinamarca · inmobiliaria de corretaje, hoy NO responsable de IVA</div>
    <div class="meta">
      <span>Año fiscal <b class="lin"></b></span>
      <span>Diligenciado por <b class="lin"></b></span>
      <span>Fecha <b class="lin"></b></span>
    </div>
  </header>

  <div class="bloquea">
    <b>Lo más urgente es el punto 1.</b> Sin el CIIU de cada servicio no se puede calcular el ICA de
    <b>ningún</b> ingreso ya registrado: el sistema se detiene en vez de usar una tarifa que no corresponde.
    Los puntos 2 a 5 bloquean el arranque del año, pero no los registros.
  </div>

  <section>
    <h2><span class="n">1</span> CIIU de cada línea de servicio</h2>
    <p class="nota">El RUT registra 6820 (principal), 5911, 7010 y 6201. La tarifa de ICA se fija por actividad.
      La columna gris es nuestra suposición, <b>sin confirmar</b>: corríjala si no corresponde.</p>
    <table>
      <thead><tr><th style="width:52%">Línea de servicio</th><th style="width:24%">CIIU que aplica</th><th style="width:24%">(suponemos)</th></tr></thead>
      <tbody>
        <tr><td>Comisión por venta de inmuebles</td><td class="v"></td><td style="color:#94A3B8">6820</td></tr>
        <tr><td>Acompañamiento en estudio de títulos</td><td class="v"></td><td style="color:#94A3B8">6820</td></tr>
        <tr><td>Análisis comercial de valor</td><td class="v"></td><td style="color:#94A3B8">6820</td></tr>
        <tr><td>Fotografía con dron y fotogrametría</td><td class="v"></td><td style="color:#94A3B8">5911</td></tr>
        <tr><td>Gestión de proyectos y consorcio</td><td class="v"></td><td style="color:#94A3B8">7010</td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <h2><span class="n">2</span> Valor del UVT del año</h2>
    <p class="nota">De él dependen todas las bases mínimas de retención. Fuente: resolución anual de la DIAN.</p>
    <div style="font-size:11pt">1 UVT = $ <span class="lin" style="min-width:170px"></span> COP</div>
  </section>

  <section>
    <h2><span class="n">3</span> ¿Responsable de IVA este año?</h2>
    <p class="nota">Se confirma año por año: depende de los topes del art. 437 del E.T. El sistema no asume la respuesta.</p>
    <div style="font-size:10pt">
      ☐ NO es responsable &nbsp;&nbsp;&nbsp; ☐ SÍ es responsable → tarifa de IVA <span class="lin" style="min-width:55px"></span> %
      &nbsp;·&nbsp; ¿agente de reteIVA? ☐ No ☐ Sí → <span class="lin" style="min-width:55px"></span> %
    </div>
  </section>

  <section>
    <h2><span class="n">4</span> Retención en la fuente</h2>
    <p class="nota">Dos tarifas por concepto, según el tercero declare o no declare renta. La base mínima en UVT es clave:
      si la base no la supera, no se retiene. Escriba <b>0</b> si no tiene base mínima.</p>
    <table>
      <thead><tr><th style="width:34%">Concepto</th><th>Declara renta</th><th>NO declara</th><th>Base mínima (UVT)</th></tr></thead>
      <tbody>
        <tr><td>Comisiones</td><td class="v"></td><td class="v"></td><td class="v"></td></tr>
        <tr><td>Honorarios</td><td class="v"></td><td class="v"></td><td class="v"></td></tr>
        <tr><td>Servicios</td><td class="v"></td><td class="v"></td><td class="v"></td></tr>
        <tr><td>Arrendamiento</td><td class="v"></td><td class="v"></td><td class="v"></td></tr>
        <tr><td>Compras</td><td class="v"></td><td class="v"></td><td class="v"></td></tr>
        <tr><td class="v"></td><td class="v"></td><td class="v"></td><td class="v"></td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <h2><span class="n">5</span> ICA por municipio y actividad</h2>
    <p class="nota">Se declara donde se genera el ingreso. Si la tarifa es igual para todas las actividades,
      deje el CIIU en blanco: eso significa «tarifa general del municipio».</p>
    <table>
      <thead><tr><th style="width:44%">Municipio</th><th style="width:28%">CIIU</th><th style="width:28%">Tarifa (por mil)</th></tr></thead>
      <tbody>
        <tr><td>La Vega, Cundinamarca</td><td class="v"></td><td class="v"></td></tr>
        <tr><td class="v"></td><td class="v"></td><td class="v"></td></tr>
        <tr><td class="v"></td><td class="v"></td><td class="v"></td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <h2><span class="n">6</span> Por cada cliente o proveedor, una vez</h2>
    <p class="nota">No son del año: salen del RUT de cada tercero y determinan qué retención aplica. Documento y DV,
      nombre o razón social, natural o jurídica, y si es responsable de IVA, autorretenedor, gran contribuyente y
      <b>declarante de renta</b> (esto último decide cuál de las dos tarifas del punto 4 se usa).</p>
  </section>

  <div class="firma">
    <div>Firma del contador</div>
    <div>Tarjeta profesional</div>
    <div>Fecha</div>
  </div>

  <p style="margin-top:12px; font-size:8.5pt; color:var(--muted)">
    Versión para diligenciar en pantalla y enviar por WhatsApp, con las explicaciones completas:
    <b>www.sufincaraiz.com/interno/datos-contador</b> · Documento interno de Su Finca Raíz.
  </p>
</main>
</body>
</html>`

export const dynamic = 'force-static'

export function GET() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  })
}
