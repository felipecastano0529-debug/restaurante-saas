// app/[slug]/page.js
// Ruta dinámica del menú público: restaurante-saas.vercel.app/la-braseria

import MenuPage from '@/components/MenuPage'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return {
    title: `Menú — ${slug}`,
    description: `Haz tu pedido en línea`,
  }
}

export default async function RestaurantMenuRoute({ params }) {
  const { slug } = await params
  return <MenuPage slug={slug} />
}
