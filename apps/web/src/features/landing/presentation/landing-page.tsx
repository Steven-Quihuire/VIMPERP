import {
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/ui/button';

const NAV_LINKS = [
  { label: 'Producto', href: '#producto' },
  { label: 'Funciones', href: '#funciones' },
  { label: 'Precios', href: '#precios' },
] as const;

const MODULES = [
  {
    icon: ShoppingCart,
    title: 'Ventas',
    description: 'Cotizaciones, pedidos y facturas en un solo flujo.',
  },
  {
    icon: Package,
    title: 'Inventario',
    description: 'Stock, precios y categorías siempre al día.',
  },
  {
    icon: Users,
    title: 'CRM',
    description: 'Tus clientes y su historial, centralizados.',
  },
] as const;

const INVENTORY_ROWS = [
  { name: 'Silla ergonómica', sku: 'SKU-1042', stock: 38, price: '$129.900' },
  { name: 'Escritorio de pie', sku: 'SKU-1087', stock: 12, price: '$459.000' },
  { name: 'Monitor 27"', sku: 'SKU-1103', stock: 24, price: '$312.500' },
  { name: 'Teclado mecánico', sku: 'SKU-1156', stock: 87, price: '$89.900' },
  {
    name: 'Lámpara de escritorio',
    sku: 'SKU-1189',
    stock: 6,
    price: '$54.000',
  },
] as const;

const SPARKLINE_BARS = [40, 65, 50, 80, 60, 90, 70] as const;

const BrowserFrameMock = () => (
  <div
    aria-hidden="true"
    className="overflow-hidden rounded-xl border bg-card shadow-sm"
  >
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <div className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex h-6 flex-1 items-center rounded-md bg-muted px-2 text-[11px] text-muted-foreground">
        app.vimcore.com/dashboard/inventario
      </div>
    </div>
    <div className="flex">
      <div className="flex flex-col items-center gap-4 border-r px-3 py-4">
        <LayoutDashboard className="size-4 text-muted-foreground" />
        <ShoppingCart className="size-4 text-muted-foreground" />
        <Package className="size-4 text-foreground" />
        <Users className="size-4 text-muted-foreground" />
        <Settings className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Inventario</p>
            <p className="text-[11px] text-muted-foreground">
              38 artículos activos
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
            En stock
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {SPARKLINE_BARS.map((height, index) => (
            <div key={index} className="rounded-md border p-2">
              <p className="text-[10px] text-muted-foreground">
                Unidades vendidas
              </p>
              <div className="mt-2 flex h-8 items-end gap-0.5">
                {[45, 70, 55, 85].map((barHeight, barIndex) => (
                  <div
                    key={barIndex}
                    className="flex-1 rounded-sm bg-foreground/15"
                    style={{ height: `${(barHeight * height) / 100}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-2 text-[11px]">
          <p className="font-medium text-muted-foreground">Producto</p>
          <p className="font-medium text-muted-foreground">SKU</p>
          <p className="font-medium text-muted-foreground">Stock</p>
          <p className="font-medium text-muted-foreground">Precio</p>
          {INVENTORY_ROWS.map((row) => (
            <div
              key={row.sku}
              className="col-span-4 grid grid-cols-4 items-center gap-2 py-1.5"
            >
              <p className="truncate font-medium">{row.name}</p>
              <p className="text-muted-foreground">{row.sku}</p>
              <p>{row.stock}</p>
              <p className="font-medium tabular-nums">{row.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const LandingPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Boxes className="size-5" />
          Vimcore
        </Link>
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
        <Button asChild size="sm">
          <Link to="/register">Registrarse</Link>
        </Button>
      </nav>
    </header>

    <main>
      <section
        id="producto"
        className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28"
      >
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Tu empresa en un solo sistema.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Ventas, inventario y clientes en un solo lugar, sin fricción.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <Button asChild size="lg">
              <Link to="/register">Comenzar gratis</Link>
            </Button>
            <a
              href="#producto"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver demo
            </a>
          </div>
        </div>
        <BrowserFrameMock />
      </section>

      <section id="funciones" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Todo lo que tu negocio necesita.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {MODULES.map((module) => (
            <div key={module.title} className="rounded-xl border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <module.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{module.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {module.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="precios" className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Prueba Vimcore gratis.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Registrate en menos de un minuto y empezá a organizar tu empresa.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/register">Comenzar gratis</Link>
          </Button>
        </div>
      </section>
    </main>

    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>© 2026 Vimcore. Todos los derechos reservados.</p>
        <p className="text-xs">ventas · inventario · crm</p>
      </div>
    </footer>
  </div>
);
