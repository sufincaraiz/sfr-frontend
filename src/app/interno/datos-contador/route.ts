import { CODIFICADOR_JS } from '@/lib/finanzas/formulario-contador'

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO DEL CONTADOR — parámetros fiscales del año
//
// Documento INTERNO, no contenido del sitio:
//   · noindex, nofollow en cabecera HTTP y en meta; fuera de todos los sitemaps
//     (no se lista en ninguno) y sin enlaces desde el sitio.
//   · HTML autónomo servido por una ruta, SIN el layout: así se imprime limpio en
//     A4, sin menú, pie ni chat, y carga rápido en el teléfono del contador.
//
// Se llena en pantalla y se guarda SOLO en el teléfono (localStorage). No hay
// envío al servidor: «Enviar» abre WhatsApp con un resumen legible y un código
// que la pantalla /admin/finanzas/parametros importa. Así no se abre ningún
// endpoint público de escritura, y lo importado entra SIN REVISAR.
//
// El codificador del código es el mismo texto que prueba scripts/probar-finanzas.mjs.
// ─────────────────────────────────────────────────────────────────────────────

const WHATSAPP = '573218826730'

const CONCEPTOS_FIJOS = ['Comisiones', 'Honorarios', 'Servicios', 'Arrendamiento', 'Compras']

const filaConcepto = (label: string | null, i: number) => `
        <tr data-concepto>
          <td data-l="Concepto">${label
            ? `<span class="fijo">${label}</span><input type="hidden" data-c="label" value="${label}">`
            : `<input type="text" data-c="label" placeholder="Otro concepto" aria-label="Otro concepto ${i}">`}</td>
          <td data-l="Si declara renta"><span class="pct"><input type="text" inputmode="decimal" data-c="declarante" aria-label="Tarifa si declara"> %</span></td>
          <td data-l="Si NO declara"><span class="pct"><input type="text" inputmode="decimal" data-c="no_declarante" aria-label="Tarifa si no declara"> %</span></td>
          <td data-l="Base mínima (UVT)"><input type="text" inputmode="decimal" data-c="base_uvt" aria-label="Base mínima en UVT"></td>
        </tr>`

const filaIca = (municipio: string | null, i: number) => `
        <tr data-ica>
          <td data-l="Municipio">${municipio
            ? `<span class="fijo">${municipio}</span><input type="hidden" data-i="municipio" value="${municipio}">`
            : `<input type="text" data-i="municipio" placeholder="Otro municipio" aria-label="Otro municipio ${i}">`}</td>
          <td data-l="CIIU"><input type="text" data-i="ciiu" placeholder="6820" aria-label="CIIU de la tarifa ${i}"></td>
          <td data-l="Tarifa (por mil)"><span class="pct"><input type="text" inputmode="decimal" data-i="tarifa" aria-label="Tarifa por mil"> ‰</span></td>
        </tr>`

/** Una línea de servicio del negocio, para que el contador le asigne su CIIU. */
const filaServicio = (linea: string, sugerido: string) => `
        <tr data-servicio>
          <td data-l="Línea de servicio"><span class="fijo">${linea}</span><input type="hidden" data-s="linea" value="${linea}"></td>
          <td data-l="CIIU que aplica"><input type="text" data-s="ciiu" placeholder="${sugerido}" aria-label="CIIU de ${linea}"></td>
        </tr>`

const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Parámetros fiscales — datos para el contador · Su Finca Raíz</title>
<style>
  :root { --navy:#0D2D5E; --gold:#E8B92F; --ink:#1E293B; --muted:#64748B; --line:#CBD5E1; --soft:#F1F5F9; --warn:#B45309; --ok:#15803D; }
  * { box-sizing: border-box; }
  body { margin:0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--ink); background:#fff; }
  main { max-width: 820px; margin: 0 auto; padding: 20px 18px 120px; }
  header.doc { border-bottom: 3px solid var(--navy); padding-bottom: 12px; margin-bottom: 18px; }
  .marca { font-weight: 800; color: var(--navy); font-size: 1.05rem; letter-spacing:.2px; }
  .marca small { display:block; font-weight:600; color:var(--muted); font-size:.8rem; }
  h1 { font-size: 1.35rem; color: var(--navy); margin: 14px 0 10px; line-height:1.25; }
  h2 { font-size: 1.02rem; color: var(--navy); margin: 0 0 6px; }
  .meta { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  label.campo { display:block; font-size:.78rem; font-weight:700; color:var(--muted); }
  input[type=text], input[type=number], input[type=date] { width:100%; font: inherit; padding: 9px 10px; border:1.5px solid var(--line); border-radius: 8px; background:#fff; color: var(--ink); }
  input:focus { outline: 2px solid var(--gold); border-color: var(--navy); }
  section { border:1px solid var(--line); border-radius: 12px; padding: 14px 16px; margin: 14px 0; }
  .contexto { background: var(--soft); border-color: transparent; font-size: .9rem; }
  .contexto ul { margin: 6px 0; padding-left: 20px; }
  .nota { font-size: .82rem; color: var(--muted); margin: 6px 0 10px; }
  .clave { border-left: 3px solid var(--gold); padding-left: 10px; }
  .opciones { display:flex; gap: 10px; flex-wrap: wrap; margin: 8px 0; }
  .opciones label { display:flex; align-items:center; gap:8px; border:1.5px solid var(--line); border-radius: 10px; padding: 10px 14px; font-weight:700; cursor:pointer; }
  .opciones input { width: 18px; height: 18px; }
  .uvt { display:flex; align-items:center; gap: 10px; max-width: 360px; }
  .uvt span { font-weight:700; white-space:nowrap; }
  table { width:100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid var(--line); padding: 6px 6px; text-align:left; vertical-align: middle; }
  th { font-size: .74rem; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); }
  .fijo { font-weight: 700; }
  .pct { display:flex; align-items:center; gap:4px; }
  .pct input { min-width: 0; }
  .si-iva { margin-top: 8px; padding: 10px 12px; border-radius: 10px; background: #FFFBEB; }
  .acciones { position: fixed; left:0; right:0; bottom:0; background: rgba(255,255,255,.97); border-top:1px solid var(--line); padding: 10px 14px; display:flex; gap:8px; justify-content:center; flex-wrap: wrap; }
  .acciones button { font: inherit; font-weight: 800; border-radius: 10px; padding: 11px 16px; border: 1.5px solid var(--navy); background:#fff; color: var(--navy); cursor:pointer; }
  .acciones button.principal { background: #1FA855; border-color:#1FA855; color:#fff; }
  #estado { width:100%; text-align:center; font-size:.78rem; color: var(--muted); }
  #codigo { width:100%; font: 12px monospace; margin-top: 8px; }
  .firma { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
  .solo-impresion { display:none; }

  /* Teléfono: cada fila de tabla se vuelve tarjeta, con su etiqueta. */
  @media screen and (max-width: 640px) {
    .meta { grid-template-columns: 1fr; }
    table, thead, tbody, tr, td { display:block; width:100%; }
    thead { display:none; }
    tr { border:1px solid var(--line); border-radius: 10px; padding: 8px 10px; margin-bottom: 10px; }
    td { border:none; padding: 4px 0; }
    td::before { content: attr(data-l); display:block; font-size:.72rem; font-weight:700; color:var(--muted); text-transform: uppercase; }
    .firma { grid-template-columns: 1fr; }
  }

  /* A4: tablas reales, compactas, y ninguna tabla partida entre páginas. */
  @page { size: A4; margin: 12mm; }
  @media print {
    body { font-size: 9.5pt; }
    main { max-width: none; padding: 0; }
    .acciones, .no-imprimir { display:none !important; }
    .solo-impresion { display:block; }
    section { padding: 7px 10px; margin: 7px 0; border-radius: 6px; break-inside: avoid; page-break-inside: avoid; }
    table { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { padding: 3px 5px; }
    input[type=text], input[type=number], input[type=date] { border:none; border-bottom: 1px solid #666; border-radius:0; padding: 2px 3px; }
    .si-iva { display:block !important; background:none; border:1px dashed #999; }
    .contexto { background:none; border:1px solid var(--line); }
    h1 { font-size: 13pt; margin: 6px 0; }
  }
</style>
</head>
<body>
<main>
  <header class="doc">
    <div class="marca">Su Finca Raíz <small>Matrícula mercantil 199483 · La Vega, Cundinamarca</small></div>
    <h1>Parámetros fiscales del año — datos que necesitamos del contador</h1>
    <div class="meta">
      <div><label class="campo" for="anio">Año fiscal</label><input type="number" id="anio" data-f="anio" inputmode="numeric"></div>
      <div><label class="campo" for="por">Diligenciado por</label><input type="text" id="por" data-f="por" autocomplete="name"></div>
      <div><label class="campo" for="fecha">Fecha</label><input type="date" id="fecha" data-f="fecha"></div>
    </div>
  </header>

  <section class="contexto">
    <h2>Contexto del negocio</h2>
    <p style="margin:4px 0">Su Finca Raíz es una <strong>inmobiliaria de corretaje</strong>. <strong>No</strong> administra arriendos ni maneja dinero de terceros de forma recurrente: <strong>no hay cánones</strong>. Los ingresos son:</p>
    <ul>
      <li>Comisiones por venta de inmuebles</li>
      <li>Acompañamiento en estudio de títulos · análisis comercial de valor</li>
      <li>Fotografía con dron y fotogrametría · gestión de proyectos y consorcio de construcción</li>
    </ul>
    <p style="margin:4px 0">Las <strong>arras o anticipos</strong> ocasionales se registran como <strong>pasivo</strong>, no como ingreso, hasta que se causan.</p>
  </section>

  <section class="clave">
    <h2>1. Valor del UVT del año</h2>
    <p class="nota">Sin este dato el sistema no calcula nada: de él dependen todas las bases mínimas de retención. <em>Fuente: resolución anual de la DIAN.</em></p>
    <div class="uvt"><span>1 UVT =</span><input type="text" inputmode="decimal" data-f="uvt" aria-label="Valor del UVT en pesos"><span>COP</span></div>
  </section>

  <section class="clave">
    <h2>2. ¿Su Finca Raíz es responsable de IVA este año?</h2>
    <p class="nota">Hoy entendemos que <strong>no</strong>, pero depende de los ingresos del año (topes del art. 437 del Estatuto Tributario) y puede cambiar. Confírmelo <strong>año por año</strong>: el sistema no asume la respuesta.</p>
    <div class="opciones" role="radiogroup" aria-label="Responsable de IVA">
      <label><input type="radio" name="responsable_iva" value="no" data-f="responsable_iva"> No es responsable</label>
      <label><input type="radio" name="responsable_iva" value="si" data-f="responsable_iva"> Sí es responsable</label>
    </div>
    <div class="si-iva" id="bloque-iva" hidden>
      <p class="nota" style="margin-top:0"><strong>Solo si respondió SÍ:</strong></p>
      <div class="uvt"><span>Tarifa general de IVA</span><input type="text" inputmode="decimal" data-f="tarifa_iva" aria-label="Tarifa de IVA"><span>%</span></div>
      <p class="nota" style="margin:10px 0 4px">¿Es agente de retención de IVA?</p>
      <div class="opciones" style="margin-top:0">
        <label><input type="radio" name="agente_reteiva" value="no" data-f="agente_reteiva"> No</label>
        <label><input type="radio" name="agente_reteiva" value="si" data-f="agente_reteiva"> Sí</label>
      </div>
      <div class="uvt"><span>Tarifa de reteIVA</span><input type="text" inputmode="decimal" data-f="tarifa_reteiva" aria-label="Tarifa de reteIVA"><span>%</span></div>
    </div>
    <p class="nota solo-impresion">Si responde NO: no se factura IVA, el IVA pagado a proveedores es costo (no descontable) y no hay reteIVA en ninguna dirección.</p>
  </section>

  <section>
    <h2>3. Retención en la fuente — tarifas y bases mínimas</h2>
    <p class="nota">Una fila por concepto que apliquemos. La tarifa cambia según el tercero <strong>declare o no declare renta</strong>. <strong>La base mínima en UVT es clave</strong>: si la base no la supera, no se retiene. Escriba <strong>0</strong> si el concepto no tiene base mínima. Deje vacío lo que no usemos.</p>
    <table>
      <thead><tr><th>Concepto</th><th>Si declara renta</th><th>Si NO declara</th><th>Base mínima (UVT)</th></tr></thead>
      <tbody>${CONCEPTOS_FIJOS.map(c => filaConcepto(c, 0)).join('')}${filaConcepto(null, 1)}${filaConcepto(null, 2)}
      </tbody>
    </table>
  </section>

  <section>
    <h2>4. CIIU de cada línea de servicio</h2>
    <p class="nota">
      El RUT registra cuatro actividades: <strong>6820</strong> (principal), <strong>5911</strong>,
      <strong>7010</strong> y <strong>6201</strong>. Como la tarifa de ICA se fija por actividad,
      necesitamos saber bajo cuál se factura cada servicio. El texto gris es
      <strong>nuestra suposición, sin confirmar</strong>: corríjala si no es la correcta.
      Un servicio sin CIIU no calcula ICA; el sistema se detiene en vez de usar la tarifa general.
    </p>
    <table>
      <thead><tr><th>Línea de servicio</th><th>CIIU que aplica</th></tr></thead>
      <tbody>${filaServicio('Comisión por venta de inmuebles', '6820')}${filaServicio('Acompañamiento en estudio de títulos', '6820')}${filaServicio('Análisis comercial de valor', '6820')}${filaServicio('Fotografía con dron y fotogrametría', '5911')}${filaServicio('Gestión de proyectos y consorcio de construcción', '7010')}
      </tbody>
    </table>
  </section>

  <section>
    <h2>5. ICA — tarifa por municipio y actividad</h2>
    <p class="nota">
      Se declara donde se <strong>genera</strong> el ingreso. La Vega es el habitual; añada otros si
      hay operaciones fuera. Si en un municipio la tarifa es la misma para todas las actividades,
      <strong>deje el CIIU en blanco</strong>: eso significa «tarifa general del municipio».
    </p>
    <table>
      <thead><tr><th>Municipio</th><th>CIIU</th><th>Tarifa (por mil)</th></tr></thead>
      <tbody>${filaIca('La Vega, Cundinamarca', 0)}${filaIca(null, 1)}${filaIca(null, 2)}
      </tbody>
    </table>
  </section>

  <section class="contexto">
    <h2>6. Datos que pedimos UNA vez por cada cliente o proveedor</h2>
    <p class="nota" style="margin-top:0">No son del año. Los tomamos de <strong>su RUT</strong> porque determinan qué retención aplica, y no los deducimos nosotros: documento (y DV si es NIT), nombre o razón social, persona natural o jurídica, y si es <strong>responsable de IVA</strong>, <strong>autorretenedor</strong>, <strong>gran contribuyente</strong> y <strong>declarante de renta</strong> (esta última define cuál tarifa del punto 3 aplica).</p>
  </section>

  <section class="contexto">
    <h2>Qué NO le pedimos</h2>
    <p class="nota" style="margin-top:0">Facturación electrónica con CUFE (solo registramos el número y el CUFE que emita el proveedor autorizado), nómina electrónica, información exógena ni conciliación bancaria: quedan fuera de esta fase. Cuando los reportes estén listos le enviaremos un <strong>enlace de solo lectura con PIN</strong>, limitado a un periodo y con vencimiento, con descarga en Excel y PDF.</p>
  </section>

  <div class="firma solo-impresion">
    <div>Firma: ______________________________</div>
    <div>Tarjeta profesional: _________________</div>
  </div>

  <div class="no-imprimir">
    <textarea id="codigo" rows="3" readonly hidden aria-label="Código para el sistema"></textarea>
  </div>
</main>

<div class="acciones no-imprimir">
  <button type="button" class="principal" id="b-enviar">Enviar por WhatsApp</button>
  <button type="button" id="b-copiar">Copiar código</button>
  <button type="button" id="b-imprimir">Imprimir</button>
  <button type="button" id="b-borrar">Borrar</button>
  <div id="estado">Lo que escriba se guarda solo en este teléfono.</div>
</div>

<script>
${CODIFICADOR_JS}
(function () {
  var CLAVE = 'sfr-datos-contador';
  var WHATSAPP = '${WHATSAPP}';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function recolectar() {
    var val = function (f) { var el = document.querySelector('[data-f="' + f + '"]'); return el ? String(el.value || '').trim() : ''; };
    var radio = function (n) { var el = document.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ''; };
    return {
      v: 1,
      anio: parseInt(val('anio'), 10) || 0,
      por: val('por'),
      fecha: val('fecha'),
      uvt: val('uvt'),
      responsable_iva: radio('responsable_iva'),
      tarifa_iva: radio('responsable_iva') === 'si' ? val('tarifa_iva') : '',
      agente_reteiva: radio('responsable_iva') === 'si' ? radio('agente_reteiva') : '',
      tarifa_reteiva: radio('responsable_iva') === 'si' && radio('agente_reteiva') === 'si' ? val('tarifa_reteiva') : '',
      conceptos: $$('tr[data-concepto]').map(function (tr) {
        var c = function (k) { return String(tr.querySelector('[data-c="' + k + '"]').value || '').trim(); };
        return { label: c('label'), declarante: c('declarante'), no_declarante: c('no_declarante'), base_uvt: c('base_uvt') };
      }).filter(function (c) { return c.label && (c.declarante || c.no_declarante || c.base_uvt); }),
      ica: $$('tr[data-ica]').map(function (tr) {
        var i = function (k) { return String(tr.querySelector('[data-i="' + k + '"]').value || '').trim(); };
        return { municipio: i('municipio'), ciiu: i('ciiu'), tarifa: i('tarifa') };
      }).filter(function (t) { return t.municipio && t.tarifa; }),
      servicios: $$('tr[data-servicio]').map(function (tr) {
        var v = function (k) { return String(tr.querySelector('[data-s="' + k + '"]').value || '').trim(); };
        return { linea: v('linea'), ciiu: v('ciiu') };
      }).filter(function (sv) { return sv.ciiu; })
    };
  }

  function guardar() {
    var datos = { campos: {}, radios: {}, filas: {} };
    $$('[data-f]').forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) datos.radios[el.name] = el.value; }
      else datos.campos[el.getAttribute('data-f')] = el.value;
    });
    $$('tr[data-concepto], tr[data-ica], tr[data-servicio]').forEach(function (tr, n) {
      datos.filas[n] = $$('tr[data-concepto], tr[data-ica], tr[data-servicio]')[n].querySelectorAll('input:not([type=hidden])').length
        ? Array.prototype.map.call(tr.querySelectorAll('input:not([type=hidden])'), function (i) { return i.value; })
        : [];
    });
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); $('#estado').textContent = 'Guardado en este teléfono ✓'; }
    catch (e) { $('#estado').textContent = 'Este navegador no permite guardar: envíelo o imprímalo antes de cerrar.'; }
  }

  function cargar() {
    var datos = null;
    try { datos = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) {}
    if (!datos) {
      $('#anio').value = String(new Date().getFullYear());
      $('#fecha').value = new Date().toISOString().slice(0, 10);
      return;
    }
    Object.keys(datos.campos || {}).forEach(function (f) {
      var el = document.querySelector('[data-f="' + f + '"]:not([type=radio])'); if (el) el.value = datos.campos[f];
    });
    Object.keys(datos.radios || {}).forEach(function (n) {
      var el = document.querySelector('input[name="' + n + '"][value="' + datos.radios[n] + '"]'); if (el) el.checked = true;
    });
    $$('tr[data-concepto], tr[data-ica], tr[data-servicio]').forEach(function (tr, n) {
      var vals = (datos.filas || {})[n] || [];
      Array.prototype.forEach.call(tr.querySelectorAll('input:not([type=hidden])'), function (i, k) { if (vals[k] !== undefined) i.value = vals[k]; });
    });
  }

  function refrescarIva() {
    var r = document.querySelector('input[name="responsable_iva"]:checked');
    $('#bloque-iva').hidden = !(r && r.value === 'si');
  }

  function faltan(d) {
    var f = [];
    if (!d.anio) f.push('el año fiscal');
    if (!d.uvt) f.push('el valor del UVT');
    if (!d.responsable_iva) f.push('si es o no responsable de IVA');
    if (d.responsable_iva === 'si' && !d.tarifa_iva) f.push('la tarifa de IVA');
    if (!d.conceptos.length) f.push('al menos un concepto de retención');
    return f;
  }

  function mensaje(d, codigo) {
    var l = [];
    l.push('Parámetros fiscales ' + d.anio + ' — Su Finca Raíz');
    l.push('Diligenciado por: ' + (d.por || '—') + ' · ' + (d.fecha || '—'));
    l.push('');
    l.push('UVT: ' + (d.uvt || '—'));
    l.push('Responsable de IVA: ' + (d.responsable_iva === 'si' ? 'Sí' : d.responsable_iva === 'no' ? 'No' : 'sin responder'));
    if (d.responsable_iva === 'si') {
      l.push('Tarifa de IVA: ' + (d.tarifa_iva || '—') + ' %');
      l.push('Agente de reteIVA: ' + (d.agente_reteiva === 'si' ? 'Sí, ' + (d.tarifa_reteiva || '—') + ' %' : d.agente_reteiva === 'no' ? 'No' : '—'));
    }
    l.push('');
    l.push('Retención (declara / no declara / base UVT):');
    d.conceptos.forEach(function (c) { l.push('- ' + c.label + ': ' + (c.declarante || '—') + ' % / ' + (c.no_declarante || '—') + ' % / ' + (c.base_uvt || '—')); });
    if (d.servicios.length) {
      l.push('');
      l.push('CIIU por linea de servicio:');
      d.servicios.forEach(function (sv) { l.push('- ' + sv.linea + ': ' + sv.ciiu); });
    }
    if (d.ica.length) {
      l.push('');
      l.push('ICA (por mil):');
      d.ica.forEach(function (t) { l.push('- ' + t.municipio + (t.ciiu ? ' (CIIU ' + t.ciiu + ')' : ' (todas las actividades)') + ': ' + t.tarifa); });
    }
    l.push('');
    l.push('Código para el sistema (no editar):');
    l.push(codigo);
    return l.join('\\n');
  }

  function preparar() {
    var d = recolectar();
    var f = faltan(d);
    if (f.length && !confirm('Todavía falta: ' + f.join(', ') + '.\\n\\n¿Enviarlo así de todos modos? Puede completarlo y reenviarlo después.')) return null;
    return { d: d, codigo: codificarRespuesta(d) };
  }

  document.addEventListener('input', function () { refrescarIva(); guardar(); });
  document.addEventListener('change', function () { refrescarIva(); guardar(); });

  $('#b-enviar').addEventListener('click', function () {
    var p = preparar(); if (!p) return;
    window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensaje(p.d, p.codigo)), '_blank');
  });
  $('#b-copiar').addEventListener('click', function () {
    var p = preparar(); if (!p) return;
    var ta = $('#codigo'); ta.hidden = false; ta.value = mensaje(p.d, p.codigo); ta.select();
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { $('#estado').textContent = 'Copiado. Péguelo en un correo o mensaje.'; }, function () {});
  });
  $('#b-imprimir').addEventListener('click', function () { window.print(); });
  $('#b-borrar').addEventListener('click', function () {
    if (!confirm('¿Borrar todo lo escrito en este teléfono?')) return;
    try { localStorage.removeItem(CLAVE); } catch (e) {}
    location.reload();
  });

  cargar();
  refrescarIva();
})();
</script>
</body>
</html>`

export function GET() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Documento interno: nunca al índice, aunque alguien lo enlace.
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  })
}
