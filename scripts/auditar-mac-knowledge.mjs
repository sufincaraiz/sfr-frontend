#!/usr/bin/env node
/**
 * `mac_knowledge` ES DATO, NUNCA INSTRUCCIÓN
 * ==========================================
 *
 * `prompt.ts` se lo dice a Mac: el conocimiento es dato. Pero nada lo hacía
 * cumplir del lado de quien escribe las entradas, y pasó tres veces:
 *
 *  · «Tobia Chica» era un PROMPT entero —«tu objetivo es… debes sonar
 *    persuasivo y enfocado en resaltar el valor de inversión»—. Borrada.
 *  · «La Rivera — Lotes» llevaba reglas de precio y de conteo de inventario.
 *    Migradas al prompt, generalizadas.
 *  · «Lote campestre 500 m²» era más de la mitad instrucciones: guiones de
 *    respuesta literal, listas de expresiones a usar y cuatro prohibiciones
 *    sobre servicios y topografía. Migradas.
 *
 * Dos detectores, porque son dos problemas distintos:
 *
 *  · PERSUASIÓN — la entrada intenta cambiar el CARÁCTER del agente. Es la
 *    peligrosa: inyecta comportamiento por la vía de los datos.
 *  · INSTRUCCIÓN — la entrada le dice QUÉ HACER o QUÉ DECIR. Suele ser bien
 *    intencionada —guardarraíles de honestidad— y por eso se cuela; pero aquí
 *    nadie la revisa, y aplica a UNA propiedad cuando casi siempre vale para
 *    todas.
 *
 *     node scripts/auditar-mac-knowledge.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PERSUASION = /\b(tu objetivo|tu meta|tu rol|debes sonar|act[uú]a como|comp[oó]rtate|eres el |eres la |eres mac|reglas de interacci[oó]n|persuasiv)/i

// Imperativos y perífrasis de deber dirigidos al agente. Se buscan a principio
// de línea, que es como se escriben las órdenes.
const INSTRUCCION = new RegExp(
  '^\\s*(' +
  'no\\s+(presentar|afirmar|prometer|ocultar|garantizar|decir|mencionar|entregar|usar|utilizar|olvides)|' +
  '(presentar|responder|explicar|aclara|aclarar|destaca|destacar|menciona|mencionar|utilizar|usar|indicar|informa|informar|recuerda|evita|evitar)\\b|' +
  '(debe|deben|debes|hay que|se debe|conviene)\\s+\\w+|' +
  'cuando (un |el )?cliente\\b|si (el |los )?(cliente|preguntan|pregunta)\\b|' +
  's[eé] honesto|importante:\\s*$' +
  ')', 'i',
)

let conPersuasion = 0
let conInstruccion = 0

for (const k of await prisma.macKnowledge.findMany({
  select: { id: true, titulo: true, contenido: true, activo: true },
  orderBy: { titulo: 'asc' },
})) {
  const lineas = k.contenido.split('\n')
  const persu = lineas.filter(l => PERSUASION.test(l))
  const instr = lineas.filter(l => INSTRUCCION.test(l))

  const marca = persu.length ? '⛔ ' : instr.length ? '⚠  ' : '   '
  console.log(`${marca}${k.activo ? '' : '(inactiva) '}${k.titulo}  [${k.id.slice(0, 8)}] ${k.contenido.length} car.`)
  if (persu.length) { conPersuasion++; for (const l of persu) console.log(`      PERSUASIÓN: ${l.trim().slice(0, 108)}`) }
  if (instr.length) { conInstruccion++; for (const l of instr) console.log(`      instrucción: ${l.trim().slice(0, 108)}`) }
}

console.log(`\n${conPersuasion} entrada(s) con persuasión · ${conInstruccion} con instrucciones.`)
console.log('Lo que aplique a más de una propiedad va a prompt.ts, generalizado.')
await prisma.$disconnect()
