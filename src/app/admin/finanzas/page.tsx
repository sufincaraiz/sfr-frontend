import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, Clock, HandCoins, ListChecks, Receipt, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { roleCanAccessAdminPath } from '@/lib/permissions';
import { faltantesEmpresa } from '@/lib/finanzas/empresa';
import { resumenDelMes } from '@/lib/finanzas/egresos';

// Entrada del módulo de finanzas: el mes, lo que falta por completar y lo que
// hay por cobrar. El botón «+ Gasto» lo pone el layout, y está en todas las
// pantallas del módulo.
//
// COMPONENTE DE SERVIDOR a propósito: el NIT y la razón social viven en
// variables de entorno SIN NEXT_PUBLIC_, que no existen en el navegador. Si
// esta pantalla fuera de cliente, `faltantesEmpresa()` vería siempre todo
// vacío y el aviso de «datos pendientes» no desaparecería nunca.

const PROXIMOS = ['Custodia de dineros de terceros', 'Reportes de retenciones, IVA e ICA (esperan los parámetros del año)'];
const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', warn: '#B45309', bad: '#B91C1C' };
const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;
// Aquí había un `text-transform: capitalize` que ponía mayúscula a CADA
// palabra: «Gastos De Septiembre De 2026». En español ni los meses ni las
// preposiciones se capitalizan, así que la frase va tal cual la devuelve
// `toLocaleString`, en minúscula, dentro de «Gastos de …».

/** «1 movimiento registrado» / «2 movimientos registrados». */
const plural = (n: number, singular: string, plural_: string) => `${n} ${n === 1 ? singular : plural_}`;

export const dynamic = 'force-dynamic';

export default async function FinanzasPage() {
  const sesion = await requireSession();
  if (!sesion) redirect('/admin/login');
  if (!roleCanAccessAdminPath(sesion.role, '/admin/finanzas')) redirect('/admin');

  const faltan = faltantesEmpresa();
  const verParametros = roleCanAccessAdminPath(sesion.role, '/admin/finanzas/parametros');
  const r = await resumenDelMes();

  const tarjeta: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1.1rem 1.25rem', textDecoration: 'none', display: 'block' };

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '5rem' }}>
      {faltan.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, padding: '1rem 1.25rem' }}>
          <AlertTriangle size={20} style={{ color: C.warn, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.86rem', color: '#78350F', lineHeight: 1.5 }}>
            <strong>Datos de la empresa pendientes: {faltan.join(', ')}.</strong><br />
            Mientras falten, todo reporte sale marcado «NO VÁLIDO PARA DECLARAR».
          </div>
        </div>
      )}

      <div style={{ ...tarjeta, display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: C.muted, fontSize: '0.8rem' }}>Ingresos de {r.mes}</div>
          <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.7rem' }}>{dinero(r.ingresos)}</div>
          <div style={{ color: C.muted, fontSize: '0.78rem' }}>{plural(r.ingresosCantidad, 'ingreso registrado', 'ingresos registrados')}</div>
        </div>
        <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: '2rem' }}>
          <div style={{ color: C.muted, fontSize: '0.8rem' }}>Gastos de {r.mes}</div>
          <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.7rem' }}>{dinero(r.gastos)}</div>
          <div style={{ color: C.muted, fontSize: '0.78rem' }}>{plural(r.movimientos, 'movimiento registrado', 'movimientos registrados')}</div>
        </div>
        <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: '2rem' }}>
          <div style={{ color: C.muted, fontSize: '0.8rem' }}>Resultado del mes</div>
          {/* Ingresos menos gastos. No necesita tarifas, así que se puede
              mostrar aunque el año fiscal siga en borrador. */}
          <div style={{ color: Number(r.resultado) < 0 ? C.bad : C.navy, fontWeight: 800, fontSize: '1.7rem' }}>{dinero(r.resultado)}</div>
          <div style={{ color: C.muted, fontSize: '0.78rem' }}>antes de impuestos</div>
        </div>
        <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: '2rem' }}>
          <div style={{ color: C.muted, fontSize: '0.8rem' }}>Por cobrar a clientes</div>
          <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.7rem' }}>{dinero(r.porCobrar.total)}</div>
          <div style={{ color: C.muted, fontSize: '0.78rem' }}>no es gasto ni ingreso</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        <Link href="/admin/finanzas/egresos?por_completar=1" style={tarjeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.navy, fontWeight: 800 }}>
            <ListChecks size={18} style={{ color: C.blue }} /> Por completar
          </div>
          {r.porCompletar ? (
            <div style={{ fontSize: '0.84rem', marginTop: 6 }}>
              {/* El recibo primero y resaltado: sin soporte, el gasto no se
                  sostiene ante la DIAN. Los otros dos son papeleo. */}
              <div style={{ color: r.falta.recibo ? C.bad : C.muted, fontWeight: r.falta.recibo ? 800 : 400 }}>
                {r.falta.recibo} sin recibo
              </div>
              <div style={{ color: C.muted }}>
                {r.falta.proveedor} sin proveedor · {r.falta.factura} sin factura
              </div>
              <div style={{ color: C.muted, marginTop: 4 }}>Ya cuentan en los reportes.</div>
            </div>
          ) : (
            <div style={{ color: C.muted, fontSize: '0.84rem', marginTop: 4 }}>Nada pendiente de completar.</div>
          )}
        </Link>

        <Link href="/admin/finanzas/por-cobrar" style={tarjeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.navy, fontWeight: 800 }}>
            <HandCoins size={18} style={{ color: C.blue }} /> Por cobrar
          </div>
          {/* Mismo criterio que la pantalla de por cobrar: esperar a un
              cliente es gris hasta los 30 días; a partir de ahí la espera pasa
              a ser asunto nuestro y escala a ámbar y a rojo. */}
          <div style={{
            color: !r.porCobrar.cantidad ? C.muted
              : r.porCobrar.tramo === '+60' ? C.bad
              : r.porCobrar.tramo === '31-60' ? C.warn : C.muted,
            fontWeight: r.porCobrar.tramo === '+60' ? 700 : 400,
            fontSize: '0.84rem', marginTop: 4,
          }}>
            {r.porCobrar.cantidad
              ? `${plural(r.porCobrar.cantidad, 'adelanto que el cliente debe devolver', 'adelantos que el cliente debe devolver')}` +
                (r.porCobrar.tramo === '+60' ? ', el más viejo hace más de 60 días.'
                  : r.porCobrar.tramo === '31-60' ? ', el más viejo hace más de un mes.' : '.')
              : 'Nada por cobrar.'}
          </div>
        </Link>

        <Link href="/admin/finanzas/ingresos" style={tarjeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.navy, fontWeight: 800 }}>
            <TrendingUp size={18} style={{ color: C.blue }} /> Ingresos
          </div>
          {/* Cada espera con su color: la factura es nuestra (ámbar); el
              recaudo lo trae el cliente y el CIIU el contador (gris). */}
          {r.ingresos_falta.factura + r.ingresos_falta.recaudo + r.ingresos_falta.ciiu === 0 ? (
            <div style={{ color: C.muted, fontSize: '0.84rem', marginTop: 4 }}>Comisiones y servicios, con su reparto.</div>
          ) : (
            <div style={{ fontSize: '0.84rem', marginTop: 4 }}>
              {r.ingresos_falta.factura > 0 && (
                <div style={{ color: C.warn, fontWeight: 700 }}>{plural(r.ingresos_falta.factura, 'sin factura', 'sin factura')}</div>
              )}
              {r.ingresos_falta.recaudo > 0 && (
                <div style={{ color: C.muted }}>{r.ingresos_falta.recaudo} sin cobrar</div>
              )}
              {r.ingresos_falta.ciiu > 0 && (
                /* La espera del contador escala sola: gris, ámbar al mes,
                   rojo a los dos. */
                <div style={{
                  color: r.ingresos_falta.ciiu_espera === 'rojo' ? C.bad
                    : r.ingresos_falta.ciiu_espera === 'ambar' ? C.warn : C.muted,
                  fontWeight: r.ingresos_falta.ciiu_espera === 'gris' ? 400 : 700,
                }}>
                  {r.ingresos_falta.ciiu} esperan el CIIU del contador
                  {r.ingresos_falta.ciiu_espera === 'ambar' && ' (hace más de un mes)'}
                  {r.ingresos_falta.ciiu_espera === 'rojo' && ' (hace más de 60 días)'}
                </div>
              )}
            </div>
          )}
        </Link>

        <Link href="/admin/finanzas/egresos" style={tarjeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.navy, fontWeight: 800 }}>
            <Receipt size={18} style={{ color: C.blue }} /> Gastos
          </div>
          <div style={{ color: C.muted, fontSize: '0.84rem', marginTop: 4 }}>Listado con filtros por naturaleza y categoría.</div>
        </Link>

        {verParametros && (
          <Link href="/admin/finanzas/parametros" style={tarjeta}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.navy, fontWeight: 800 }}>
              <SlidersHorizontal size={18} style={{ color: C.blue }} /> Parámetros fiscales
            </div>
            <div style={{ color: C.muted, fontSize: '0.84rem', marginTop: 4 }}>UVT, decisión de IVA, conceptos e ICA. Sin un año ACTIVO no se calcula nada.</div>
          </Link>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px dashed #CBD5E1', borderRadius: 14, padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontWeight: 800, fontSize: '0.88rem', marginBottom: 6 }}>
          <Clock size={16} /> En construcción
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: C.muted, fontSize: '0.85rem', lineHeight: 1.6 }}>
          {PROXIMOS.map(p => <li key={p}>{p}</li>)}
        </ul>
      </div>
    </div>
  );
}
