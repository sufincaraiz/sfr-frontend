// Forma de la respuesta de /api/admin/visitas, compartida por la ruta que la
// produce y por la página que la consume.
//
// Existe por una razón concreta: antes cada lado declaraba su propia interfaz y
// el literal de respuesta no estaba tipado contra ninguna. Omitir `propiedadId`
// al serializar compiló sin queja y dejó la UI de enlaces del dueño invisible en
// producción, porque la condición que la muestra dependía de ese campo. Con el
// tipo compartido, olvidar un campo es un error de compilación.

export interface VisitaAdmin {
  id: string
  createdAt: string
  nombresCompletos: string
  cedula: string
  correo: string
  celular: string
  municipioOrigen: string
  inmuebleReferencia: string
  consentAt: string
}

export interface GrupoAdmin {
  clave: string
  esOtro: boolean
  titulo: string
  municipio: string | null
  /** null en los "Otro": son de un colega y no tienen enlace de dueño. */
  propiedadId: string | null
  propiedadSlug: string | null
  totalVisitas: number
  visitas: VisitaAdmin[]
}

export interface RetencionAdmin {
  proximasAVencer: number
  yaVencidas: number
}

export interface RespuestaVisitasAdmin {
  total: number
  truncado: boolean
  retencion: RetencionAdmin
  grupos: GrupoAdmin[]
}
