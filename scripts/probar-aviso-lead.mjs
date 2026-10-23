#!/usr/bin/env node
/**
 * EL AVISO DE UN LEAD — ARNÉS
 * ===========================
 *
 * La propiedad que estas verificaciones existen para tener es una sola:
 *
 *   > Un camino de aviso no puede tener un solo `return` mudo.
 *
 * Así que la prueba central NO es «con esta configuración manda»: es que
 * **para toda entrada hay o un envío o un motivo escrito**, y nunca nada. Se
 * recorre el producto cartesiano de las tres variables de configuración más el
 * resumen, 16 combinaciones, y se exige que las 16 produzcan algo decible.
 *
 * ⚠ Y LA SEGUNDA, que es la que el defecto de verdad pedía: una lista de
 * avisos VACÍA no puede dar el mismo resultado que una lista con un fallo. Si
 * las dos dieran «no avisado», el panel no distinguiría «Meta lo rechazó» de
 * «por aquí no pasa código de aviso» — y ése segundo es el que tuvieron 9 de
 * los 12 leads de los 60 días anteriores al 2026-10-23.
 *
 *     node scripts/probar-aviso-lead.mjs
 */
import {
  decidirAviso, clasificarRespuesta, cuenta, etiquetaDeResultado,
  estadoDeAviso, pideAtencionUrgente, resumirAvisos, RESULTADOS,
} from '../src/lib/aviso-lead.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}

const COMPLETA = { to: '+573001112233', phoneId: '123456', token: 'EAAG...' }

console.log('\n══ NINGÚN CAMINO CALLADO ════════════════════════════════════')

/* LA VERIFICACIÓN CENTRAL: exhaustiva, no por muestreo. Si alguien añade una
 * condición nueva a `decidirAviso` y se le olvida el motivo, aquí se cae. */
{
  const valores = [undefined, '', '   ', 'puesto']
  let total = 0, mudos = 0, sinMotivo = 0
  for (const to of valores) for (const phoneId of valores) for (const token of valores) {
    for (const resumen of [undefined, null, '', 'un resumen']) {
      total++
      const d = decidirAviso({ to, phoneId, token }, resumen)
      if (d === undefined || d === null) { mudos++; continue }
      if (d.manda === true) {
        if (!d.destino) sinMotivo++
      } else if (!d.motivo || !d.resultado || !RESULTADOS.includes(d.resultado)) {
        sinMotivo++
      }
    }
  }
  check(`las ${total} combinaciones devuelven algo: 0 caminos mudos`,
    mudos === 0, `(${mudos} mudos)`)
  check('…y todas las que NO mandan traen motivo escrito y resultado conocido',
    sinMotivo === 0, `(${sinMotivo} sin motivo)`)
}

check('con todo configurado, manda',
  decidirAviso(COMPLETA, 'x').manda === true)

/* EL `return` MUDO ORIGINAL: `whatsapp.ts:41` salía sin escribir nada. */
{
  const d = decidirAviso({ ...COMPLETA, to: undefined }, 'x')
  check('sin destino NO manda, y dice SIN_CONFIGURAR',
    d.manda === false && d.resultado === 'SIN_CONFIGURAR')
  check('…y NOMBRA la variable que falta: se arregla sin abrir el código',
    /ALERT_WHATSAPP_TO/.test(d.motivo), d.motivo)
}
{
  const d = decidirAviso({ to: undefined, phoneId: undefined, token: undefined }, 'x')
  check('si faltan las tres, las enumera las tres',
    /ALERT_WHATSAPP_TO/.test(d.motivo) && /PHONE_NUMBER_ID/.test(d.motivo) && /ACCESS_TOKEN/.test(d.motivo),
    d.motivo)
}
check('una variable con solo espacios cuenta como ausente',
  decidirAviso({ ...COMPLETA, token: '   ' }, 'x').manda === false)

/* LA SEGUNDA PUERTA: `tools.ts` tenía `if (resumen)`, y eso convertía la falta
 * de un texto de cortesía en la falta del aviso entero. */
for (const [etiqueta, resumen] of [['undefined', undefined], ['null', null], ['vacío', ''], ['espacios', '  ']]) {
  check(`un resumen ${etiqueta} NO impide el aviso: el nombre y el teléfono bastan`,
    decidirAviso(COMPLETA, resumen).manda === true)
}

console.log('\n══ LO QUE CONTESTÓ META ═════════════════════════════════════')

check('200 → ACEPTADO_POR_META', clasificarRespuesta(200) === 'ACEPTADO_POR_META')
check('201 también', clasificarRespuesta(201) === 'ACEPTADO_POR_META')
check('400 → RECHAZADO_POR_META (plantilla o formato)', clasificarRespuesta(400) === 'RECHAZADO_POR_META')
check('401 → RECHAZADO_POR_META (token)', clasificarRespuesta(401) === 'RECHAZADO_POR_META')
check('500 de Meta también es rechazo, no error de red', clasificarRespuesta(500) === 'RECHAZADO_POR_META')
check('sin respuesta (null) → ERROR_DE_RED', clasificarRespuesta(null) === 'ERROR_DE_RED')
check('299 cuenta como aceptado y 300 no: la frontera está en 2xx',
  clasificarRespuesta(299) === 'ACEPTADO_POR_META' && clasificarRespuesta(300) === 'RECHAZADO_POR_META')

/* «ACEPTADO» NO ES «LEÍDO», y solo uno de los cinco cuenta como salido. */
check('de los cinco resultados, exactamente UNO cuenta como aviso salido',
  RESULTADOS.filter(cuenta).length === 1, `(${RESULTADOS.filter(cuenta).join()})`)
check('…y es el que no afirma entrega ni lectura en su nombre',
  cuenta('ACEPTADO_POR_META') && !/ENVIADO|ENTREGADO|LEIDO/.test(RESULTADOS.join()))
check('la etiqueta de pantalla tampoco promete lectura',
  /no confirma lectura/i.test(etiquetaDeResultado('ACEPTADO_POR_META')))

check('los cinco resultados tienen etiqueta: ninguno sale «undefined» en pantalla',
  RESULTADOS.every(r => typeof etiquetaDeResultado(r) === 'string' && etiquetaDeResultado(r).length > 5))

console.log('\n══ VACÍO NO ES LO MISMO QUE FALLIDO ═════════════════════════')

check('sin ninguna fila → NUNCA_SE_INTENTO, el defecto de los nueve',
  estadoDeAviso([]) === 'NUNCA_SE_INTENTO')
check('una fila rechazada → FALLO, que es otra cosa',
  estadoDeAviso([{ resultado: 'RECHAZADO_POR_META' }]) === 'FALLO')
check('…y los dos estados son distintos: la pantalla puede separarlos',
  estadoDeAviso([]) !== estadoDeAviso([{ resultado: 'RECHAZADO_POR_META' }]))
check('una aceptada entre varias fallidas → AVISADO: basta que uno saliera',
  estadoDeAviso([
    { resultado: 'ERROR_DE_RED' },
    { resultado: 'ACEPTADO_POR_META' },
    { resultado: 'SIN_CONFIGURAR' },
  ]) === 'AVISADO')
check('SIN_CONFIGURAR sola es FALLO, no «nunca se intentó»: hubo intento y quedó escrito',
  estadoDeAviso([{ resultado: 'SIN_CONFIGURAR' }]) === 'FALLO')
check('un valor que no es lista no revienta la pantalla',
  estadoDeAviso(undefined) === 'NUNCA_SE_INTENTO' && estadoDeAviso(null) === 'NUNCA_SE_INTENTO')

console.log('\n══ UN LEAD SIN AVISO NO PUEDE PARECER ATENDIDO ══════════════')

check('nuevo y sin avisar → pide atención urgente',
  pideAtencionUrgente('NUNCA_SE_INTENTO', 'new', null) === true)
check('nuevo con aviso fallido → también',
  pideAtencionUrgente('FALLO', 'new', null) === true)
check('nuevo y avisado → NO: está esperando a Leonel, no a que lo descubran',
  pideAtencionUrgente('AVISADO', 'new', null) === false)
check('sin avisar pero ya contactado a mano → NO: alguien lo vio',
  pideAtencionUrgente('NUNCA_SE_INTENTO', 'new', '2026-10-21') === false)
check('sin avisar pero ya movido de estado → NO: alguien lo tocó',
  pideAtencionUrgente('NUNCA_SE_INTENTO', 'contacted', null) === false)

console.log('\n══ EL RESUMEN DE LA CABECERA ════════════════════════════════')
{
  const r = resumirAvisos([
    { avisos: [{ resultado: 'ACEPTADO_POR_META' }], status: 'new', lastContactAt: null },
    { avisos: [{ resultado: 'RECHAZADO_POR_META' }], status: 'new', lastContactAt: null },
    { avisos: [], status: 'new', lastContactAt: null },
    { avisos: [], status: 'new', lastContactAt: '2026-10-01' },
    { avisos: [], status: 'closed', lastContactAt: null },
  ])
  check('cuenta los tres estados por separado',
    r.total === 5 && r.avisados === 1 && r.fallaron === 1 && r.nunca === 3,
    JSON.stringify(r))
  check('y los urgentes son 2: el fallido y el que nadie tocó',
    r.urgentes === 2, JSON.stringify(r))
}

/* EL CASO REAL, con las cifras medidas en producción el 2026-10-23. */
{
  const nueve = Array.from({ length: 9 }, () => ({ avisos: [], status: 'new', lastContactAt: null }))
  const tres = Array.from({ length: 3 }, () => ({ avisos: [], status: 'new', lastContactAt: null }))
  const r = resumirAvisos([...nueve, ...tres])
  check('los 12 leads del incidente: 12 sin constancia, 12 urgentes',
    r.total === 12 && r.nunca === 12 && r.urgentes === 12, JSON.stringify(r))
}

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok + fail} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
