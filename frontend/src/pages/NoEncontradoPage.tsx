import { Link } from 'react-router';

export function NoEncontradoPage() {
  return (
    <div className="centrado">
      <section className="tarjeta tarjeta--estrecha tarjeta--centrada">
        <h1 className="tarjeta__titulo">Página no encontrada</h1>
        <p className="tarjeta__subtitulo">La página que buscas no existe o fue movida.</p>
        <Link to="/" className="boton boton--primario boton--bloque">
          <span>Ir al inicio</span>
        </Link>
      </section>
    </div>
  );
}
