// ─── Contenido administrable de /registro-visita ─────────────────────────────
//
// Mismo patrón que `propuesta.ts`: una fila de PageContent con `key` y `data`
// Json, normalizada siempre por `withDefaults` para garantizar la estructura.
//
// ⚠️ LO QUE NO ESTÁ AQUÍ, A PROPÓSITO: el texto de las dos casillas de
// consentimiento. Vive fijo en el formulario (RegistroVisitaForm.tsx) y no se
// edita desde el admin. El motivo es legal: cada registro guarda
// `consentPolitica` y `consentControlIngreso` como booleanos, así que esos
// booleanos solo prueban algo si el texto que se mostró es siempre el mismo. Si
// alguien pudiera reformular una casilla desde el dashboard, los registros
// anteriores dejarían de acreditar QUÉ se aceptó (Ley 1581 de 2012).
// Para cambiar ese texto hay que tocar el código y desplegar — que es
// exactamente la fricción que se busca.

export interface CampoTextos {
  label: string;
  placeholder: string;
}

export interface RegistroVisitaContent {
  hero: {
    eyebrow: string;
    titulo: string;
    subtitulo: string;
  };
  aviso: string;
  campos: {
    nombresCompletos: CampoTextos;
    cedula: CampoTextos;
    inmuebleReferencia: CampoTextos;
    correo: CampoTextos;
    celular: CampoTextos;
    municipioOrigen: CampoTextos;
  };
  consentimiento: {
    /** Solo el encabezado del bloque. El texto de las casillas NO es editable. */
    titulo: string;
  };
  boton: {
    enviar: string;
    enviando: string;
    ayudaCasillas: string;
  };
  confirmacion: {
    titulo: string;
    mensaje: string;
    textoBotonVolver: string;
  };
  notaLegal: string;
}

export const REGISTRO_VISITA_KEY = 'registro-visita';

export const DEFAULT_REGISTRO_VISITA: RegistroVisitaContent = {
  hero: {
    eyebrow: 'Su Finca Raíz · La Vega, Cundinamarca',
    titulo: 'Registro de visita',
    subtitulo:
      'Completa este registro antes de ingresar al inmueble. Nos permite llevar el control de ingreso y acompañarte mejor durante la visita.',
  },
  aviso:
    'Todos los campos son obligatorios. Tus datos se usan únicamente para el control de ingreso y la seguridad de la visita — no se publican ni se comparten con terceros.',
  campos: {
    nombresCompletos:   { label: 'Nombres y apellidos completos', placeholder: 'Ej. María Fernanda Rodríguez Gómez' },
    cedula:             { label: 'Número de cédula',              placeholder: 'Solo números, sin puntos ni espacios' },
    inmuebleReferencia: { label: 'Inmueble que va a visitar',     placeholder: 'Referencia o nombre. Ej. LVB-005 o Casa Chicala' },
    correo:             { label: 'Correo electrónico',            placeholder: 'tucorreo@ejemplo.com' },
    celular:            { label: 'Celular',                       placeholder: '3XX XXX XXXX' },
    municipioOrigen:    { label: 'Municipio de procedencia',      placeholder: 'Ej. Bogotá, La Vega, Villeta…' },
  },
  consentimiento: {
    titulo: 'Autorización de tratamiento de datos',
  },
  boton: {
    enviar: 'Registrar mi visita',
    enviando: 'Guardando…',
    ayudaCasillas: 'Marca las dos autorizaciones para habilitar el registro.',
  },
  confirmacion: {
    titulo: 'Gracias, tu registro quedó guardado',
    mensaje:
      'Ya puedes continuar con tu visita. Si necesitas consultar, actualizar o eliminar tus datos, escríbenos y lo hacemos: es tu derecho como titular de la información.',
    textoBotonVolver: 'Volver al inicio',
  },
  notaLegal:
    'Su Finca Raíz es responsable del tratamiento de estos datos, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Puedes conocer, actualizar, rectificar o solicitar la supresión de tu información en cualquier momento.',
};

export function withDefaults(
  data: Partial<RegistroVisitaContent> | null | undefined,
): RegistroVisitaContent {
  if (!data) return DEFAULT_REGISTRO_VISITA;
  const d = DEFAULT_REGISTRO_VISITA;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (a: any, b: any) => ({ ...a, ...(b ?? {}) });
  return {
    hero:  m(d.hero, data.hero),
    aviso: data.aviso ?? d.aviso,
    campos: {
      nombresCompletos:   m(d.campos.nombresCompletos,   data.campos?.nombresCompletos),
      cedula:             m(d.campos.cedula,             data.campos?.cedula),
      inmuebleReferencia: m(d.campos.inmuebleReferencia, data.campos?.inmuebleReferencia),
      correo:             m(d.campos.correo,             data.campos?.correo),
      celular:            m(d.campos.celular,            data.campos?.celular),
      municipioOrigen:    m(d.campos.municipioOrigen,    data.campos?.municipioOrigen),
    },
    consentimiento: m(d.consentimiento, data.consentimiento),
    boton:          m(d.boton, data.boton),
    confirmacion:   m(d.confirmacion, data.confirmacion),
    notaLegal:      data.notaLegal ?? d.notaLegal,
  };
}
