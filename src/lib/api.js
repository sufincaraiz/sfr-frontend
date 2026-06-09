const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getProperties(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/properties${query ? `?${query}` : ''}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Error al obtener propiedades');
  return res.json();
}

export async function getPropertyBySlug(slug) {
  const res = await fetch(`${API_URL}/api/properties/${slug}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return res.json();
}
