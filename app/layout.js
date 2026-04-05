import './globals.css'

export const metadata = {
  title: 'RestauranteSaaS',
  description: 'Plataforma de pedidos para restaurantes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin:0, fontFamily:"'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
