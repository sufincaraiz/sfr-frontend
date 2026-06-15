// ─── Contenido administrable de la propuesta comercial ───────────────────────

export interface BrandCard { name: string; role: string; desc: string }
export interface MethodItem { title: string; text: string }
export interface Plan { tag: string; name: string; sub: string; features: string[] }
export interface SvcCol { title: string; items: string[] }
export interface ContactItem { label: string; html: string }

export interface PropuestaContent {
  hero: {
    tagLeft: string; tagRight: string; titleHtml: string; subtitle: string;
    preparedLabel: string; preparedName: string; preparedRole: string;
    brands: string[]; bgImage: string;
  };
  consorcio: {
    eyebrow: string; lede: string; intro: string[]; image: string;
    stats: { n: string; l: string }[]; brands: BrandCard[];
  };
  contexto: {
    eyebrow: string; headingHtml: string; colA: string[]; colB: string[];
    pull: string; market: string; bandImage: string;
  };
  metodo: { eyebrow: string; headingHtml: string; intro: string; items: MethodItem[]; closing: string };
  planes: { eyebrow: string; headingHtml: string; base: string; premium: Plan; flexible: Plan; bandImage: string };
  servicios: { eyebrow: string; headingHtml: string; columns: SvcCol[] };
  cierre: {
    eyebrow: string; headingHtml: string; ctaText: string; ctaHref: string;
    contacts: ContactItem[]; colophonLeft: string; colophonRight: string; bandImage: string;
  };
}

export const PROPUESTA_KEY = 'propuesta-comercial';

export const DEFAULT_PROPUESTA: PropuestaContent = {
  hero: {
    tagLeft: 'Presentación & metodología de trabajo · <b>Documento confidencial</b>',
    tagRight: 'La Vega — Cundinamarca · 2026',
    titleHtml: 'Un consorcio,<br>una sola <em>responsabilidad:</em><br>su patrimonio.',
    subtitle: 'Ocho años en el mercado nos posicionan como referentes regionales.',
    preparedLabel: 'Preparado para',
    preparedName: 'Señores Propietarios',
    preparedRole: ' — presentación de servicios',
    brands: ['Su Finca Raíz', 'Bienes Raíces La Vega', 'Conarc'],
    bgImage: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
  },
  consorcio: {
    eyebrow: 'El consorcio',
    lede: 'Un consorcio, una sola responsabilidad: su patrimonio.',
    intro: [
      'Somos un consorcio de bienes raíces con sede en La Vega, Cundinamarca, que reúne a dos inmobiliarias y una constructora bajo un mismo propósito. Trabajamos con un equipo interdisciplinario de profesionales para ofrecer un servicio integral y certero: desde la asesoría comercial hasta el diseño, los trámites y la ejecución.',
      'Atendemos en La Vega y en toda Cundinamarca desde nuestra oficina principal en la Calle 21 # 2-18, Los Naranjos.',
    ],
    image: '/images/la-vega/finca-campestre-la-vega-cundinamarca.jpg',
    stats: [
      { n: '8', l: 'Años en el mercado' },
      { n: '3', l: 'Disciplinas' },
      { n: 'La Vega', l: 'Y Cundinamarca' },
      { n: 'IA', l: 'Apoyo estratégico' },
    ],
    brands: [
      { name: 'Su Finca Raíz', role: 'Inmobiliaria', desc: 'Conectamos propietarios con compradores e inversionistas. Especialistas en fincas, proyectos rurales y propiedades de alto potencial de valorización.' },
      { name: 'Bienes Raíces La Vega', role: 'Inmobiliaria', desc: 'Aliado inmobiliario con profundo conocimiento del territorio, que amplía el alcance comercial y la red de compradores en La Vega y la región del Gualivá.' },
      { name: 'Conarc', role: 'Constructora', desc: 'Diseñamos y construimos proyectos residenciales, turísticos y comerciales con altos estándares de calidad y sostenibilidad.' },
    ],
  },
  contexto: {
    eyebrow: 'El punto de partida',
    headingHtml: 'Un activo de este nivel <em>no se vende, se posiciona.</em>',
    colA: [
      'Una propiedad en La Vega o en la región del Gualivá no se mueve como una casa de barrio con cientos de compradores potenciales. Su comprador natural es un inversionista o una familia que busca un proyecto: un mercado pequeño, calificado y exigente.',
      'Vender bien en este nicho no es publicar un aviso y esperar. Es llegar a la persona correcta, con la historia correcta y con material que sostenga el valor que se pide.',
    ],
    colB: [
      'Antes de salir al mercado, revisamos la trazabilidad del predio y los escenarios reales de retorno. Lo que cierra una venta de este nivel es la confianza, y esta se construye con un proyecto bien presentado y un equipo que responde.',
    ],
    pull: 'El mercado en La Vega no para de valorizarse.',
    market: 'Según nuestra experiencia y los datos del sector, La Vega está catalogada entre los cinco mejores municipios de Cundinamarca para el descanso y el desarrollo de proyectos. La demanda es alta por tres razones sostenibles: ubicación, clima y seguridad. A esto sumamos nuestra lectura experta de la coyuntura nacional: el ánimo inversionista se mueve con la confianza, y vista estratégicamente, cualquier coyuntura es una ventana de oportunidad para quien tiene el capital.',
    bandImage: '/images/la-vega/vista-aerea-la-vega-cundinamarca.jpg',
  },
  metodo: {
    eyebrow: 'Cómo vendemos',
    headingHtml: 'Una maquinaria de venta, <em>no un aviso clasificado.</em>',
    intro: 'La promoción inmobiliaria responsable combina presencia física, alianzas y una estrategia digital construida con criterio. Así ponemos a circular su inmueble:',
    items: [
      { title: 'Sala de ventas física', text: 'Punto de atención propio en La Vega para recibir y calificar interesados en el territorio.' },
      { title: 'Convenios estratégicos', text: 'Red de inmobiliarias aliadas que amplía el alcance hacia el comprador e inversionista en Bogotá y la Sabana.' },
      { title: 'Presencia digital asertiva', text: 'Difusión a través de sufincaraiz.com con material a la altura del activo.' },
      { title: 'Redes sociales segmentadas', text: 'Campañas dirigidas al perfil exacto del comprador en Facebook e Instagram.' },
      { title: 'Video y formatos inmersivos', text: 'YouTube y TikTok para mostrar el predio en movimiento y llegar a nuevas audiencias.' },
      { title: 'Portales líderes en Colombia', text: 'Presencia corporativa destacada en Metrocuadrado, Fincaraíz y Mercado Libre.' },
    ],
    closing: 'Con todas las herramientas tecnológicas a disposición y el apoyo de nuestros agentes de Inteligencia Artificial, diseñamos la estrategia idónea para vender responsablemente.',
  },
  planes: {
    eyebrow: 'Planes de comercialización',
    headingHtml: 'Dos esquemas de trabajo, <em>una misma exigencia.</em>',
    base: 'En ambos planes usted cuenta con garantías base: un contrato con vigencia de <b>un (1) año</b> y una comisión del <b>5%</b> sobre el valor final de venta.',
    premium: {
      tag: '★ Con exclusividad',
      name: 'Plan Premium',
      sub: 'Diseñado para vender más rápido, al mejor precio y con la máxima exposición. Su Finca Raíz asume una inversión total e inmediata desplegando todo nuestro arsenal tecnológico.',
      features: [
        '<b>Red global:</b> conexión con corredores a nivel nacional e internacional para atraer inversionistas extranjeros.',
        '<b>Producción audiovisual top:</b> fotografía profesional, tomas con drones y recorridos 360° para destacar la topografía y dimensiones.',
        '<b>Posicionamiento destacado:</b> pauta prioritaria pagada en los mejores portales inmobiliarios de Colombia.',
        '<b>Estrategia ofensiva:</b> marketing digital pautado y segmentado específicamente para desarrolladores o inversionistas.',
        '<b>Flexibilidad justa (cláusula 50%):</b> si durante el contrato usted o un tercero vende el inmueble directamente, solo reconocerá el 2.5% de comisión. No es una penalidad, sino una compensación justa por la fuerte inversión financiera y publicitaria que realizamos desde el día uno.',
      ],
    },
    flexible: {
      tag: 'Sin exclusividad',
      name: 'Plan Flexible',
      sub: 'Para quienes prefieren mantener múltiples opciones abiertas, comprendiendo que el ritmo de venta será más orgánico y pausado.',
      features: [
        '<b>Libertad total:</b> puede entregar la propiedad a múltiples agencias de forma simultánea.',
        '<b>Promoción estándar:</b> difusión mediante procesos orgánicos en nuestras plataformas, sin pauta publicitaria pagada ni posicionamiento destacado.',
        '<b>Tiempos de venta:</b> debido a la naturaleza orgánica, la captación del comprador ideal suele tomar más tiempo.',
        '<b>Pago contra resultados:</b> la comisión del 5% solo se causa y se paga si la venta se realiza directa y exclusivamente mediante un cliente traído por Su Finca Raíz.',
      ],
    },
    bandImage: '/images/la-vega/paisaje-la-vega-cundinamarca-finca.jpg',
  },
  servicios: {
    eyebrow: 'Servicios integrales',
    headingHtml: 'Todo lo que un proyecto necesita, <em>bajo un mismo techo.</em>',
    columns: [
      { title: 'Inmobiliario y comercial', items: ['Asesoría y promoción de venta (La Vega y municipios vecinos).', 'Caracterización de mercado y estrategias.', 'Avalúos y trámites inmobiliarios, prediales y legales.'] },
      { title: 'Arquitectura y diseño', items: ['Anteproyectos arquitectónicos, interiorismo y paisajismo.', 'Diseño de huertas y sistemas productivos.', 'Topografía y planimetría.'] },
      { title: 'Estrategia y visualización', items: ['Análisis de viabilidad, factibilidad y prefactibilidad turística.', 'Planes maestros de fincas.', 'Renders, recorridos 360° dinámicos y ejecución de obra.'] },
    ],
  },
  cierre: {
    eyebrow: 'El siguiente paso',
    headingHtml: 'Posicionemos su patrimonio <em>como merece.</em>',
    ctaText: 'Hablemos por WhatsApp →',
    ctaHref: 'https://wa.me/573218826730',
    contacts: [
      { label: 'Oficina', html: 'Calle 21 # 2-18, Los Naranjos<br>La Vega, Cundinamarca' },
      { label: 'Teléfono / WhatsApp', html: '<a href="tel:+573218826730">+57 321 882 6730</a>' },
      { label: 'Correo', html: '<a href="mailto:sufincaraiz.comercial@gmail.com">sufincaraiz.comercial@gmail.com</a>' },
      { label: 'Facebook', html: '<a href="https://www.facebook.com/inmobiliariasufincaraiz" target="_blank" rel="noopener">@inmobiliariasufincaraiz</a>' },
      { label: 'Instagram', html: '<a href="https://www.instagram.com/sufincaraizlavega" target="_blank" rel="noopener">@sufincaraizlavega</a>' },
      { label: 'TikTok', html: '<a href="https://www.tiktok.com/@sufincaraiz" target="_blank" rel="noopener">@sufincaraiz</a>' },
    ],
    colophonLeft: 'Su Finca Raíz · Bienes Raíces La Vega · Conarc',
    colophonRight: 'El potencial existe — la transformación depende de la visión.',
    bandImage: '/images/la-vega/la-vega-cundinamarca-home.jpg',
  },
};

// Mezcla profunda superficial: usa el default para cualquier campo ausente
export function withDefaults(data: Partial<PropuestaContent> | null | undefined): PropuestaContent {
  if (!data) return DEFAULT_PROPUESTA;
  const d = DEFAULT_PROPUESTA;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (a: any, b: any) => ({ ...a, ...(b ?? {}) });
  return {
    hero:      m(d.hero, data.hero),
    consorcio: m(d.consorcio, data.consorcio),
    contexto:  m(d.contexto, data.contexto),
    metodo:    m(d.metodo, data.metodo),
    planes: {
      ...m(d.planes, data.planes),
      premium:  m(d.planes.premium, data.planes?.premium),
      flexible: m(d.planes.flexible, data.planes?.flexible),
    },
    servicios: m(d.servicios, data.servicios),
    cierre:    m(d.cierre, data.cierre),
  };
}

// ─── Render del HTML completo (mismo diseño de marca) ─────────────────────────

const METHOD_ICONS = [
  '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>',
  '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="m10 8 5 3-5 3z"/>',
  '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
];

const CSS = `
  :root{--navy:#0D2D5E;--blue:#1B56A1;--gold:#E8B92F;--green:#A7CB61;--bg:#F8FAFC;--ink:#0D2D5E;--text:#475569;--muted:#64748B;--line:#E2E8F0;--white:#fff;--maxw:1180px;--pad:clamp(1.3rem,5vw,4rem);}
  *{box-sizing:border-box;}html{scroll-behavior:smooth;}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto;}}
  body{margin:0;background:var(--bg);color:var(--text);font-family:'Montserrat',system-ui,sans-serif;font-weight:400;line-height:1.7;font-size:clamp(1rem,1.05vw,1.06rem);-webkit-font-smoothing:antialiased;overflow-x:hidden;}
  h1,h2,h3{font-family:'Montserrat',sans-serif;color:var(--ink);line-height:1.12;margin:0;font-weight:800;letter-spacing:-0.01em;}
  p{margin:0 0 1.1em;}a{color:inherit;}
  .wrap{max-width:var(--maxw);margin:0 auto;padding-left:var(--pad);padding-right:var(--pad);}
  .eyebrow{font-size:.74rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--green);display:flex;align-items:center;gap:.7rem;margin:0 0 1.2rem;}
  .eyebrow::before{content:"";width:26px;height:2px;background:var(--gold);}.eyebrow.center{justify-content:center;}
  .progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--gold);z-index:90;transition:width .1s linear;}
  .topnav{position:fixed;top:0;left:0;right:0;z-index:70;display:flex;align-items:center;justify-content:space-between;padding:.85rem var(--pad);background:rgba(13,45,94,0);transition:background .35s ease;}
  .topnav.solid{background:rgba(13,45,94,.96);backdrop-filter:blur(8px);box-shadow:0 2px 20px rgba(0,0,0,.25);}
  .topnav .logo{height:34px;}.topnav nav{display:flex;gap:.3rem;}
  .topnav nav a{color:rgba(255,255,255,.7);text-decoration:none;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.5rem .7rem;border-radius:6px;transition:color .25s,background .25s;}
  .topnav nav a:hover,.topnav nav a.active{color:var(--navy);background:var(--gold);}@media(max-width:820px){.topnav nav{display:none;}}
  section{position:relative;padding:clamp(4rem,11vh,8rem) 0;overflow:hidden;}section.light{background:var(--white);}section.tint{background:var(--bg);}
  .sec-i{position:absolute;top:clamp(1.6rem,4vh,2.6rem);right:var(--pad);font-size:.72rem;font-weight:700;letter-spacing:.1em;color:var(--blue);opacity:.6;}
  .hero{min-height:100vh;display:flex;align-items:center;color:#fff;}
  .hero-bg{position:absolute;inset:0;z-index:0;}.hero-bg img{width:100%;height:100%;object-fit:cover;animation:kb 18s ease-out forwards;}
  @keyframes kb{from{transform:scale(1.12);}to{transform:scale(1);}}
  .hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(13,45,94,.94) 0%,rgba(13,45,94,.78) 45%,rgba(27,86,161,.55) 100%);}
  .hero .wrap{position:relative;z-index:1;width:100%;}
  .hero .tagrow{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7);border-bottom:1px solid rgba(255,255,255,.18);padding-bottom:1.1rem;margin-bottom:clamp(2rem,6vh,4rem);}
  .hero .tagrow b{color:var(--gold);}
  .hero h1{color:#fff;font-weight:900;font-size:clamp(2.6rem,7vw,5.4rem);letter-spacing:-0.025em;}.hero h1 em{font-style:normal;color:var(--gold);}
  .hero .sub{max-width:46ch;margin-top:1.6rem;color:rgba(255,255,255,.9);font-size:clamp(1.05rem,1.7vw,1.4rem);font-weight:500;line-height:1.5;}
  .hero-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:1.5rem;flex-wrap:wrap;margin-top:clamp(2.6rem,8vh,5rem);}
  .prepared .lbl{font-size:.68rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);display:block;margin-bottom:.4rem;}
  .prepared .nm{font-weight:800;font-size:1.5rem;color:#fff;}.prepared .ro{color:rgba(255,255,255,.65);font-size:.9rem;}
  .lockup{display:flex;align-items:center;gap:.9rem;font-size:.74rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75);flex-wrap:wrap;}.lockup .sep{width:1px;height:13px;background:rgba(255,255,255,.3);}
  .scrollcue{position:absolute;bottom:1.6rem;left:50%;transform:translateX(-50%);z-index:1;color:rgba(255,255,255,.6);font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;}
  .reveal{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);}.reveal.in{opacity:1;transform:none;}
  .d1{transition-delay:.08s;}.d2{transition-delay:.16s;}.d3{transition-delay:.24s;}.d4{transition-delay:.32s;}.d5{transition-delay:.4s;}
  @media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none;}}
  .lede{font-weight:800;font-size:clamp(1.7rem,3.6vw,2.7rem);line-height:1.12;letter-spacing:-0.02em;max-width:16ch;}
  .display{font-weight:900;font-size:clamp(2rem,5.4vw,3.8rem);letter-spacing:-0.025em;line-height:1.08;}
  .display em,.lede em{font-style:normal;color:var(--blue);}section.dark .display em,section.dark .lede em{color:var(--gold);}
  .two-col{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(2rem,5vw,4.5rem);align-items:start;}@media(max-width:860px){.two-col{grid-template-columns:1fr;gap:2rem;}}
  .narrow{max-width:54ch;}.narrow p{text-align:justify;}
  .media{border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(13,45,94,.18);position:relative;}
  .media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .8s ease;}.media:hover img{transform:scale(1.05);}.media.tall{aspect-ratio:4/5;}
  .brand-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem;margin-top:3rem;}@media(max-width:860px){.brand-grid{grid-template-columns:1fr;}}
  .brand-card{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:1.9rem 1.6rem;border-top:4px solid var(--gold);transition:transform .3s,box-shadow .3s;}
  .brand-card:hover{transform:translateY(-4px);box-shadow:0 18px 44px rgba(13,45,94,.12);}
  .brand-card .bn{font-weight:900;font-size:1.4rem;color:var(--navy);}.brand-card .br{font-size:.66rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--blue);margin:.3rem 0 1rem;}.brand-card p{font-size:.92rem;margin:0;color:var(--text);}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:1.2rem;border-radius:16px;overflow:hidden;background:var(--line);}@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr);}}
  .stat{background:var(--navy);padding:1.8rem 1.4rem;text-align:center;}.stat .n{font-weight:900;font-size:clamp(1.8rem,4vw,2.6rem);color:var(--gold);line-height:1;}.stat .l{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7);margin-top:.6rem;}
  section.dark{color:rgba(255,255,255,.86);}section.dark.navy{background:linear-gradient(135deg,#0D2D5E 0%,#1B56A1 100%);}
  section.dark h1,section.dark h2,section.dark h3{color:#fff;}section.dark .eyebrow{color:var(--gold);}section.dark .eyebrow::before{background:var(--gold);}section.dark .sec-i{color:var(--gold);opacity:.7;}section.dark .wrap{position:relative;z-index:1;}
  .img-band{position:absolute;inset:0;z-index:0;opacity:.16;}.img-band img{width:100%;height:100%;object-fit:cover;}
  .pull{border-left:4px solid var(--gold);padding-left:clamp(1.2rem,3vw,2.2rem);margin-top:3rem;max-width:34ch;}.pull p{font-weight:800;font-size:clamp(1.4rem,2.8vw,2.1rem);line-height:1.25;margin:0;color:#fff;}
  .method-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem;margin-top:3rem;}@media(max-width:860px){.method-grid{grid-template-columns:1fr;}}
  .m-item{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:1.7rem 1.5rem;transition:transform .3s,box-shadow .3s;}.m-item:hover{transform:translateY(-4px);box-shadow:0 16px 38px rgba(13,45,94,.1);background:#fff;}
  .m-item .ic{width:46px;height:46px;border-radius:11px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;}.m-item .ic svg{width:22px;height:22px;stroke:var(--blue);}
  .m-item h3{font-size:1.1rem;font-weight:800;margin-bottom:.45rem;}.m-item p{font-size:.9rem;margin:0;color:var(--text);}
  .plan-base{text-align:center;max-width:64ch;margin:1.5rem auto 0;font-size:clamp(1rem,1.4vw,1.15rem);color:rgba(255,255,255,.9);}.plan-base b{color:var(--gold);font-weight:800;}
  .plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;margin-top:3rem;}@media(max-width:860px){.plan-grid{grid-template-columns:1fr;}}
  .plan{background:var(--white);border-radius:18px;padding:2.3rem 2rem;display:flex;flex-direction:column;box-shadow:0 14px 40px rgba(0,0,0,.18);}
  .plan.featured{background:linear-gradient(160deg,#0D2D5E,#1B56A1);color:#fff;border:2px solid var(--gold);}
  .plan-tag{font-size:.7rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:.7rem;}.plan.featured .plan-tag{color:var(--gold);}.plan:not(.featured) .plan-tag{color:var(--blue);}
  .plan-name{font-weight:900;font-size:clamp(1.7rem,3vw,2.1rem);letter-spacing:-0.02em;line-height:1;}.plan.featured .plan-name{color:#fff;}.plan:not(.featured) .plan-name{color:var(--navy);}
  .plan-sub{font-size:.94rem;line-height:1.6;margin:.9rem 0 1.5rem;}.plan.featured .plan-sub{color:rgba(255,255,255,.85);}.plan:not(.featured) .plan-sub{color:var(--text);}
  .plan ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.9rem;}
  .plan li{font-size:.91rem;line-height:1.55;padding-left:1.5rem;position:relative;}.plan li::before{content:"";position:absolute;left:0;top:.55em;width:9px;height:9px;border-radius:50%;background:var(--gold);}
  .plan.featured li{color:rgba(255,255,255,.86);}.plan:not(.featured) li{color:var(--text);}.plan li b{font-weight:800;}.plan.featured li b{color:#fff;}.plan:not(.featured) li b{color:var(--navy);}
  .svc3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem;margin-top:3rem;}@media(max-width:860px){.svc3{grid-template-columns:1fr;}}
  .svc{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:1.9rem 1.6rem;}
  .svc h3{font-size:.82rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--blue);padding-bottom:.8rem;margin:0 0 1rem;border-bottom:2px solid #EFF6FF;}
  .svc ul{list-style:none;margin:0;padding:0;}.svc li{font-size:.91rem;color:var(--text);padding:.5rem 0 .5rem 1.4rem;position:relative;line-height:1.45;border-bottom:1px solid #F1F5F9;}.svc li:last-child{border-bottom:none;}.svc li::before{content:"\\2713";position:absolute;left:0;color:var(--green);font-weight:800;}
  .cta-btn{display:inline-flex;align-items:center;gap:.7rem;margin-top:2.2rem;background:var(--gold);color:var(--navy);text-decoration:none;font-weight:800;font-size:.95rem;padding:1rem 2rem;border-radius:12px;transition:transform .3s,box-shadow .3s;}.cta-btn:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(232,185,47,.35);}
  .contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem 1.5rem;margin-top:3.5rem;border-top:1px solid rgba(255,255,255,.18);padding-top:2.6rem;}@media(max-width:760px){.contact-grid{grid-template-columns:1fr 1fr;}}@media(max-width:480px){.contact-grid{grid-template-columns:1fr;}}
  .cg .cl{font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:.6rem;}.cg p,.cg a{font-size:.93rem;color:rgba(255,255,255,.86);margin:0;text-decoration:none;line-height:1.6;display:block;transition:color .25s;}.cg a:hover{color:var(--gold);}
  .colophon{margin-top:3.5rem;display:flex;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;font-size:.72rem;font-weight:600;letter-spacing:.06em;color:rgba(255,255,255,.6);border-top:1px solid rgba(255,255,255,.18);padding-top:1.6rem;}
`;

export function renderPropuesta(c: PropuestaContent): string {
  const stats = c.consorcio.stats.map(s => `<div class="stat"><div class="n">${s.n}</div><div class="l">${s.l}</div></div>`).join('');
  const brands = c.consorcio.brands.map((b, i) => `<div class="brand-card reveal d${i + 1}"><div class="bn">${b.name}</div><div class="br">${b.role}</div><p>${b.desc}</p></div>`).join('');
  const intro = c.consorcio.intro.map(p => `<p>${p}</p>`).join('');
  const colA = c.contexto.colA.map(p => `<p>${p}</p>`).join('');
  const colB = c.contexto.colB.map(p => `<p>${p}</p>`).join('');
  const methodItems = c.metodo.items.map((it, i) => `<div class="m-item reveal d${(i % 3) + 1}"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${METHOD_ICONS[i] ?? ''}</svg></div><h3>${it.title}</h3><p>${it.text}</p></div>`).join('');
  const planLis = (p: Plan) => p.features.map(f => `<li>${f}</li>`).join('');
  const svc = c.servicios.columns.map((col, i) => `<div class="svc reveal d${i + 1}"><h3>${col.title}</h3><ul>${col.items.map(it => `<li>${it}</li>`).join('')}</ul></div>`).join('');
  const contacts = c.cierre.contacts.map((ct, i) => `<div class="cg reveal d${(i % 3) + 1}"><div class="cl">${ct.label}</div>${ct.html.includes('<a') || ct.html.includes('<') ? ct.html : `<p>${ct.html}</p>`}</div>`).join('');
  const brandLockup = c.hero.brands.map(b => `<span>${b}</span>`).join('<span class="sep"></span>');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Presentación y Metodología de Trabajo — Su Finca Raíz · Bienes Raíces La Vega · Conarc</title>
<meta name="description" content="Presentación, metodología de comercialización y planes de trabajo del consorcio Su Finca Raíz, Bienes Raíces La Vega y Conarc.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="progress" id="progress"></div>
<header class="topnav" id="topnav">
  <img src="/images/logo-su-finca-raiz-blanco.png" alt="Su Finca Raíz" class="logo">
  <nav id="topnav-links">
    <a href="#consorcio">Consorcio</a><a href="#contexto">Contexto</a><a href="#metodo">Metodología</a>
    <a href="#planes">Planes</a><a href="#servicios">Servicios</a><a href="#cierre">Conversemos</a>
  </nav>
</header>
<main>
  <section id="hero" class="hero">
    <div class="hero-bg"><img src="${c.hero.bgImage}" alt="Panorámica de La Vega, Cundinamarca"></div>
    <div class="wrap">
      <div class="tagrow reveal"><span>${c.hero.tagLeft}</span><span>${c.hero.tagRight}</span></div>
      <h1 class="reveal d1">${c.hero.titleHtml}</h1>
      <p class="sub reveal d2">${c.hero.subtitle}</p>
      <div class="hero-foot">
        <div class="prepared reveal d4"><span class="lbl">${c.hero.preparedLabel}</span><span class="nm">${c.hero.preparedName}</span><span class="ro">${c.hero.preparedRole}</span></div>
        <div class="lockup reveal d5">${brandLockup}</div>
      </div>
    </div>
    <div class="scrollcue">Desliza ↓</div>
  </section>

  <section id="consorcio" class="light">
    <div class="sec-i">01 — Quiénes somos</div>
    <div class="wrap">
      <div class="two-col">
        <div class="reveal">
          <p class="eyebrow">${c.consorcio.eyebrow}</p>
          <h2 class="lede">${c.consorcio.lede}</h2>
          <div class="media tall reveal d2" style="margin-top:2rem;"><img src="${c.consorcio.image}" alt="Finca campestre en La Vega"></div>
        </div>
        <div class="narrow reveal d1">
          ${intro}
          <div class="stats" style="margin-top:2rem;">${stats}</div>
        </div>
      </div>
      <div class="brand-grid">${brands}</div>
    </div>
  </section>

  <section id="contexto" class="dark navy">
    <div class="img-band"><img src="${c.contexto.bandImage}" alt="Vista aérea de La Vega"></div>
    <div class="sec-i">02 — Contexto y mentalidad</div>
    <div class="wrap">
      <div class="reveal"><p class="eyebrow">${c.contexto.eyebrow}</p><h2 class="display" style="max-width:18ch;">${c.contexto.headingHtml}</h2></div>
      <div class="two-col" style="margin-top:2.6rem;">
        <div class="narrow reveal d1">${colA}</div>
        <div class="narrow reveal d2">${colB}</div>
      </div>
      <div class="pull reveal d2"><p>${c.contexto.pull}</p></div>
      <div class="narrow reveal d3" style="margin-top:1.6rem;max-width:66ch;"><p>${c.contexto.market}</p></div>
    </div>
  </section>

  <section id="metodo" class="tint">
    <div class="sec-i">03 — Metodología</div>
    <div class="wrap">
      <div class="two-col">
        <div class="reveal"><p class="eyebrow">${c.metodo.eyebrow}</p><h2 class="display" style="max-width:14ch;">${c.metodo.headingHtml}</h2></div>
        <div class="narrow reveal d1"><p>${c.metodo.intro}</p></div>
      </div>
      <div class="method-grid">${methodItems}</div>
      <div class="narrow reveal d3" style="margin-top:2.4rem;max-width:68ch;"><p>${c.metodo.closing}</p></div>
    </div>
  </section>

  <section id="planes" class="dark navy">
    <div class="img-band"><img src="${c.planes.bandImage}" alt="Paisaje de finca en La Vega"></div>
    <div class="sec-i">04 — Planes</div>
    <div class="wrap">
      <div class="reveal" style="text-align:center;"><p class="eyebrow center">${c.planes.eyebrow}</p><h2 class="display" style="margin:0 auto;max-width:20ch;">${c.planes.headingHtml}</h2></div>
      <p class="plan-base reveal d1">${c.planes.base}</p>
      <div class="plan-grid">
        <div class="plan featured reveal d1"><div class="plan-tag">${c.planes.premium.tag}</div><div class="plan-name">${c.planes.premium.name}</div><p class="plan-sub">${c.planes.premium.sub}</p><ul>${planLis(c.planes.premium)}</ul></div>
        <div class="plan reveal d2"><div class="plan-tag">${c.planes.flexible.tag}</div><div class="plan-name">${c.planes.flexible.name}</div><p class="plan-sub">${c.planes.flexible.sub}</p><ul>${planLis(c.planes.flexible)}</ul></div>
      </div>
    </div>
  </section>

  <section id="servicios" class="light">
    <div class="sec-i">05 — Servicios integrales</div>
    <div class="wrap">
      <div class="reveal"><p class="eyebrow">${c.servicios.eyebrow}</p><h2 class="display" style="max-width:22ch;">${c.servicios.headingHtml}</h2></div>
      <div class="svc3">${svc}</div>
    </div>
  </section>

  <section id="cierre" class="dark navy">
    <div class="img-band"><img src="${c.cierre.bandImage}" alt="La Vega, Cundinamarca"></div>
    <div class="wrap">
      <div class="reveal"><p class="eyebrow">${c.cierre.eyebrow}</p><h2 class="display" style="max-width:18ch;">${c.cierre.headingHtml}</h2></div>
      <a class="cta-btn reveal d1" href="${c.cierre.ctaHref}" target="_blank" rel="noopener">${c.cierre.ctaText}</a>
      <div class="contact-grid">${contacts}</div>
      <div class="colophon"><span>${c.cierre.colophonLeft}</span><span>${c.cierre.colophonRight}</span></div>
    </div>
  </section>
</main>
<script>
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); }); }
  else { var io = new IntersectionObserver(function(entries){ entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'}); document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); }); }
  var progress = document.getElementById('progress'); var topnav = document.getElementById('topnav');
  function onScroll(){ var h=document.documentElement; var max=h.scrollHeight-h.clientHeight; var st=h.scrollTop||document.body.scrollTop; progress.style.width=(max>0?(st/max*100):0)+'%'; topnav.classList.toggle('solid', st>60); }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  var links={}; document.querySelectorAll('#topnav-links a').forEach(function(a){ links[a.getAttribute('href').slice(1)]=a; });
  var navIO=new IntersectionObserver(function(entries){ entries.forEach(function(e){ if(e.isIntersecting){ var id=e.target.id; Object.keys(links).forEach(function(k){ if(links[k]) links[k].classList.toggle('active', k===id); }); } }); }, {threshold:0.5});
  document.querySelectorAll('main > section').forEach(function(s){ navIO.observe(s); });
</script>
</body>
</html>`;
}
