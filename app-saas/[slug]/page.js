// app/[slug]/page.js
// Ruta dinámica del menú público: restaurante-saas.vercel.app/la-braseria
import MenuPage from '@/components/MenuPage'

export async function generateMetadata({ params }) {
  return {
    title: `Menú — ${params.slug}`,
    description: `Haz tu pedido en línea`,
  }
}

export default function RestaurantMenuRoute({ params }) {
  return <MenuPage slug={params.slug} />
}
