import ColaYAcciones from './ColaYAcciones';

// El aviso de la cola y el botón «+ Gasto» acompañan a TODO el módulo: el
// gasto se registra donde uno esté, no solo desde una pantalla concreta.
export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColaYAcciones />
      {children}
    </>
  );
}
