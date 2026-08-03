import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Ellipsis,
  Headphones,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Package,
  Palette,
  Phone,
  Receipt,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import type { AuthSession } from '../../auth/domain/auth';
import type { erpModuleValues } from '../domain/onboarding';
import {
  MAX_ONBOARDING_SERVICES,
  normalizeServices,
  onboardingSteps,
  paletteValues,
  PRIVACY_POLICY_VERSION,
} from '../domain/onboarding';
import { useOnboardingStore } from '../infrastructure/onboarding-store';
import { useCreateCompany } from './use-onboarding';

const stepDetails = [
  {
    id: 'account',
    label: 'Tu empresa',
    description: 'Identidad principal',
    icon: Building2,
  },
  {
    id: 'legal',
    label: 'Información legal',
    description: 'Datos fiscales',
    icon: Tags,
  },
  {
    id: 'services',
    label: 'Servicios',
    description: 'Qué ofreces',
    icon: Store,
  },
  {
    id: 'address',
    label: 'Ubicación',
    description: 'Dónde operas',
    icon: MapPin,
  },
  {
    id: 'contact',
    label: 'Contacto',
    description: 'Cómo localizarte',
    icon: UserRound,
  },
  {
    id: 'palette',
    label: 'Paleta',
    description: 'Identidad visual',
    icon: Palette,
  },
  {
    id: 'module',
    label: 'Módulo principal',
    description: 'Tu foco operativo',
    icon: Store,
  },
] as const;

const paletteLabels = {
  mono: {
    name: 'Mono',
    description: 'Blanco, negro y gray de shadcn',
    gradient: 'linear-gradient(135deg, #ffffff 0%, #171717 50%, #a3a3a3 100%)',
  },
  ocean: {
    name: 'Ocean',
    description: 'Sereno y profesional',
    gradient: 'linear-gradient(135deg, #bae6fd 0%, #2563eb 50%, #172554 100%)',
  },
  forest: {
    name: 'Forest',
    description: 'Natural y confiable',
    gradient: 'linear-gradient(135deg, #bbf7d0 0%, #16a34a 50%, #14532d 100%)',
  },
  violet: {
    name: 'Violet',
    description: 'Creativo y moderno',
    gradient: 'linear-gradient(135deg, #ddd6fe 0%, #8b5cf6 50%, #4c1d95 100%)',
  },
  sunset: {
    name: 'Sunset',
    description: 'Cálido y energético',
    gradient: 'linear-gradient(135deg, #fed7aa 0%, #f97316 50%, #7c2d12 100%)',
  },
  midnight: {
    name: 'Midnight',
    description: 'Elegante y sobrio',
    gradient: 'linear-gradient(135deg, #c7d2fe 0%, #4338ca 50%, #1e1b4b 100%)',
  },
} as const;

const erpModuleOptions: Array<{
  id: (typeof erpModuleValues)[number];
  name: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'sales',
    name: 'Ventas',
    description: 'Oportunidades y pedidos',
    icon: ShoppingCart,
  },
  {
    id: 'purchases',
    name: 'Compras',
    description: 'Proveedores y adquisiciones',
    icon: ShoppingBasket,
  },
  {
    id: 'inventory',
    name: 'Inventario',
    description: 'Stock y existencias',
    icon: Package,
  },
  {
    id: 'accounting',
    name: 'Contabilidad',
    description: 'Finanzas y libros contables',
    icon: Landmark,
  },
  {
    id: 'invoicing',
    name: 'Facturación',
    description: 'Facturas y cobros',
    icon: Receipt,
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Clientes y relaciones',
    icon: Headphones,
  },
  {
    id: 'human-resources',
    name: 'Recursos humanos',
    description: 'Personas y nómina',
    icon: Users,
  },
  {
    id: 'other',
    name: 'Otro',
    description: 'No encuentro mi módulo',
    icon: Ellipsis,
  },
];

const companyNameOptions = [
  'Vimcore Labs',
  'Estudio Ámbar',
  'Café Norte',
  'Punto Norte',
  'Lumen Studio',
  'Nube Clara',
  'Raíz Digital',
  'Casa Menta',
  'Brújula Co.',
  'Taller Uno',
  'Marea Norte',
  'Nodo Central',
  'Cobalto Studio',
  'Horizonte MX',
  'Alba Consultores',
  'Trama Creativa',
  'Sierra Labs',
  'Pulso Local',
  'Órbita Servicios',
  'Andén 7',
];

const getRandomCompanySuggestions = () => {
  const options = [...companyNameOptions];

  for (let index = options.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentOption = options[index];
    const randomOption = options[randomIndex];

    if (currentOption === undefined || randomOption === undefined) {
      continue;
    }

    options[index] = randomOption;
    options[randomIndex] = currentOption;
  }

  return options.slice(0, 3);
};

const getCompanyInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 'VC';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};

const onboardingValidationWarnings: Record<
  (typeof onboardingSteps)[number],
  { title: string; description: string }
> = {
  account: {
    title: 'Nombre de empresa incompleto',
    description: 'Ingresa el nombre de tu empresa para continuar.',
  },
  legal: {
    title: 'Número de identificación no válido',
    description:
      'Comprueba que la cédula o ruc introducido sean correctos y que no contenga letras.',
  },
  services: {
    title: 'Servicios incompletos',
    description: 'Agrega al menos un servicio para continuar.',
  },
  address: {
    title: 'Dirección incompleta',
    description: 'Completa el país, la ciudad y la ubicación exacta.',
  },
  contact: {
    title: 'Contacto incompleto',
    description:
      'Ingresa un celular ecuatoriano de 10 dígitos que empiece en 09 y un correo válido.',
  },
  palette: {
    title: 'Paleta incompleta',
    description: 'Elige una paleta para personalizar tu workspace.',
  },
  module: {
    title: 'Módulo incompleto',
    description: 'Elige el módulo que mejor representa tu operación.',
  },
};

export const OnboardingPage = ({
  apiBaseUrl,
  session,
}: {
  apiBaseUrl?: string;
  session: AuthSession;
}) => {
  const navigate = useNavigate();
  const draft = useOnboardingStore((state) => state.draft);
  const currentStepIndex = useOnboardingStore(
    (state) => state.currentStepIndex,
  );
  const updateDraft = useOnboardingStore((state) => state.updateDraft);
  const goToNextStep = useOnboardingStore((state) => state.goToNextStep);
  const goToPreviousStep = useOnboardingStore(
    (state) => state.goToPreviousStep,
  );
  const hydrate = useOnboardingStore((state) => state.hydrate);
  const reset = useOnboardingStore((state) => state.reset);
  const createCompany = useCreateCompany(apiBaseUrl);
  const isSubmittingRef = useRef(false);
  const [companyNameSuggestions] = useState(getRandomCompanySuggestions);
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false);
  const [hasAcceptedPrivacyPolicy, setHasAcceptedPrivacyPolicy] =
    useState(false);

  useEffect(() => {
    hydrate(session);
  }, [hydrate, session]);

  const currentStep = onboardingSteps[currentStepIndex] ?? 'account';
  const step = stepDetails[currentStepIndex] ?? stepDetails[0];
  const companyName = draft.companyName.trim();
  const legalIdentifier = draft.legalIdentifier.trim();
  const country = draft.country.trim();
  const city = draft.city.trim();
  const exactLocation = draft.exactLocation.trim();
  const selectedServices = normalizeServices(draft.services);
  const companyInitials = getCompanyInitials(companyName);
  const selectedModule = erpModuleOptions.find(
    (module) => module.id === draft.erpModuleId,
  );
  const SelectedModuleIcon = selectedModule?.icon;

  const advanceToNextStep = () => {
    const advanced = goToNextStep();

    if (!advanced) {
      sileo.warning({
        ...onboardingValidationWarnings[currentStep],
        fill: '#171717',
        styles: {
          description: '!text-white',
        },
      });
    }

    return advanced;
  };

  const submitCompanyRegistration = async () => {
    if (isSubmittingRef.current || createCompany.isPending) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      await createCompany.mutateAsync({
        name: draft.companyName,
        legalIdentifier: draft.legalIdentifier,
        services: normalizeServices(draft.services),
        address: {
          country: draft.country,
          city: draft.city,
          exactLocation: draft.exactLocation,
        },
        contact: {
          phone: draft.contactPhone,
          email: draft.contactEmail,
        },
        paletteId: draft.paletteId,
        erpModuleId: draft.erpModuleId,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      });

      reset(session);
      sileo.success({
        title: '¡Empresa registrada con éxito!',
        description: 'Tu sistema está listo para comenzar a trabajar..',
        fill: '#171717',
        styles: {
          description: '!text-white',
        },
      });
      void navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;

      sileo.error({
        title: 'No pudimos crear la empresa',
        ...(message ? { description: message } : {}),
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const requestCompanyRegistration = () => {
    if (!advanceToNextStep()) {
      return;
    }

    setHasAcceptedPrivacyPolicy(false);
    setIsPrivacyDialogOpen(true);
  };

  const confirmCompanyRegistration = () => {
    if (!hasAcceptedPrivacyPolicy) {
      sileo.warning({
        title: 'Acepta la política de privacidad',
        description: 'Necesitas aceptar la política para registrar tu empresa.',
        fill: '#171717',
        styles: {
          description: '!text-white',
        },
      });
      return;
    }

    setIsPrivacyDialogOpen(false);
    void submitCompanyRegistration();
  };

  const renderStep = () => {
    if (currentStep === 'account') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nombre de tu empresa</Label>
            <Input
              className="placeholder:text-sm"
              id="company-name"
              aria-label="Company name"
              autoFocus
              placeholder="e.g. Vimcore Labs"
              value={draft.companyName}
              onChange={(event) =>
                updateDraft({ companyName: event.target.value })
              }
            />
            <p className="text-xs text-gray-700">
              Aparecerá en tus documentos, facturas y para tu equipo.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                ¿Necesitas inspiración? Elegí un ejemplo o escribí el tuyo.
              </p>
              <div
                className="flex flex-wrap mt-2 gap-2"
                aria-label="Company name suggestions"
              >
                {companyNameSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full cursor-pointer border bg-background px-3 py-1.5 text-xs font-medium duration-300 ease-in-out transition-all hover:text-white hover:bg-black"
                    onClick={() => updateDraft({ companyName: suggestion })}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 'legal') {
      return (
        <div className="space-y-2">
          <Label htmlFor="legal-id">RUC o Documento de Identificación</Label>
          <Input
            className="placeholder:text-sm"
            id="legal-id"
            aria-label="Legal or tax identifier"
            autoFocus
            inputMode="numeric"
            maxLength={13}
            placeholder="1790012344001"
            value={draft.legalIdentifier}
            onChange={(event) =>
              updateDraft({
                legalIdentifier: event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 13),
              })
            }
          />
          <p className="text-xs text-gray-700">
            Ingresa los 10 dígitos de tu cédula o los 13 de tu RUC.
          </p>
        </div>
      );
    }

    if (currentStep === 'services') {
      const hasReachedServiceLimit =
        draft.services.length >= MAX_ONBOARDING_SERVICES;
      const addService = () => {
        const service = draft.servicesInput.trim();

        if (service.length === 0) {
          return;
        }

        if (draft.services.length >= MAX_ONBOARDING_SERVICES) {
          sileo.warning({
            title: 'Límite de servicios alcanzado',
            description: 'Puedes agregar hasta 5 servicios para tu empresa.',
            fill: '#171717',
            styles: {
              description: '!text-white',
            },
          });
          return;
        }

        if (
          draft.services.some(
            (existingService) =>
              existingService.toLowerCase() === service.toLowerCase(),
          )
        ) {
          updateDraft({ servicesInput: '' });
          return;
        }

        updateDraft({
          services: [...draft.services, service],
          servicesInput: '',
        });
      };

      return (
        <div className="space-y-2">
          <Label htmlFor="services">Servicios de la empresa</Label>
          {draft.services.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              aria-label="Selected company services"
            >
              {draft.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-sm text-foreground"
                >
                  {service}
                  <button
                    type="button"
                    className="cursor-pointer flex rounded-full px-0.5 text-muted-foreground ease-in-out duration-300 transition-all hover:bg-primary/10 hover:text-foreground"
                    aria-label={`Eliminar ${service}`}
                    onClick={() =>
                      updateDraft({
                        services: draft.services.filter(
                          (currentService) => currentService !== service,
                        ),
                      })
                    }
                  >
                    <span
                      className=" w-4 flex items-center justify-center rounded-full"
                      aria-hidden="true"
                    >
                      ×
                    </span>
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {!hasReachedServiceLimit ? (
            <Input
              className="placeholder:text-sm"
              id="services"
              aria-label="Services"
              autoFocus
              placeholder="Consultoría, Ventas, Desarrollo..."
              value={draft.servicesInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addService();
                }
              }}
              onChange={(event) =>
                updateDraft({ servicesInput: event.target.value })
              }
            />
          ) : null}
          <p
            aria-live="polite"
            className={cn(
              'text-xs mt-4',
              hasReachedServiceLimit
                ? 'font-medium text-destructive'
                : 'text-gray-700',
            )}
          >
            {hasReachedServiceLimit
              ? 'Has llegado al máximo de 5 servicios.'
              : 'Escribe un servicio y presiona Enter para agregarlo (máximo 5).'}
          </p>
        </div>
      );
    }

    if (currentStep === 'address') {
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="country">Pais</Label>
            <Input
              className="placeholder:text-sm"
              id="country"
              aria-label="Country"
              autoFocus
              placeholder="Ecuador"
              value={draft.country}
              onChange={(event) => updateDraft({ country: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              className="placeholder:text-sm"
              id="city"
              aria-label="City"
              placeholder="Quito, Guayaquil, Cuenca..."
              value={draft.city}
              onChange={(event) => updateDraft({ city: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exact-location">Ubicación exacta</Label>
            <Input
              className="placeholder:text-sm"
              id="exact-location"
              aria-label="Exact location"
              placeholder="Av. Constitución 123, Centro"
              value={draft.exactLocation}
              onChange={(event) =>
                updateDraft({ exactLocation: event.target.value })
              }
            />
          </div>
        </div>
      );
    }

    if (currentStep === 'contact') {
      return (
        <div className="space-y-7">
          <div className="grid gap-8">
            <div className="space-y-2">
              <Label htmlFor="contact-phone">
                Teléfono celular ecuatoriano
              </Label>
              <Input
                className="placeholder:text-sm"
                id="contact-phone"
                aria-label="Teléfono celular ecuatoriano"
                autoFocus
                inputMode="tel"
                maxLength={10}
                placeholder="0991234567"
                value={draft.contactPhone}
                onChange={(event) =>
                  updateDraft({
                    contactPhone: event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 10),
                  })
                }
              />
              <p className="text-xs text-gray-700">
                Usa un número celular activo de 10 dígitos (ej. 0991234567).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Correo electrónico</Label>
              <Input
                className="placeholder:text-sm"
                id="contact-email"
                aria-label="Correo electrónico"
                type="email"
                placeholder="hola@tuempresa.com"
                value={draft.contactEmail}
                onChange={(event) =>
                  updateDraft({ contactEmail: event.target.value })
                }
              />
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 'palette') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="size-4" />
            <Label>Elige una paleta</Label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {paletteValues.map((palette) => {
              const option = paletteLabels[palette];
              const selected = draft.paletteId === palette;
              return (
                <button
                  key={palette}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent',
                    selected &&
                      'border-primary bg-primary/[0.04] ring-1 ring-primary',
                  )}
                  onClick={() => updateDraft({ paletteId: palette })}
                >
                  <span
                    className="size-11 shrink-0 rounded-full shadow-inner ring-1 ring-black/10"
                    style={{ backgroundImage: option.gradient }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {option.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {selected ? (
                    <Check className="ml-auto size-4 text-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {erpModuleOptions.map((option) => {
            const Icon = option.icon;
            const selected = draft.erpModuleId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                className={cn(
                  'flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-colors hover:bg-accent',
                  selected &&
                    'border-primary bg-primary/[0.04] ring-1 ring-primary',
                )}
                onClick={() => updateDraft({ erpModuleId: option.id })}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {option.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                {selected ? (
                  <Check className="ml-auto size-4 text-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="bg-muted/30" aria-busy={createCompany.isPending}>
      <div className="flex h-dvh min-h-0 overflow-hidden">
        <aside className="hidden w-96 shrink-0 flex-col bg-primary px-4 py-8 text-primary-foreground lg:flex">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg">
              <img
                src="./logo__sintext__vimcore.webp"
                alt="logo de la empresa Vimcore"
              />
            </div>{' '}
            VIMPERP
          </div>
          <div className="mt-8">
            <div className="mx-auto w-full max-w-sm rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-2 py-4 shadow-2xl shadow-black/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary-foreground/80" />
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
                    Vista previa
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary-foreground/60">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
                  En vivo
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-primary-foreground/10 bg-black/10 p-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground text-sm font-bold text-primary shadow-sm"
                  style={{
                    backgroundImage: paletteLabels[draft.paletteId].gradient,
                    color: draft.paletteId === 'mono' ? '#ffffff' : undefined,
                  }}
                >
                  {companyInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary-foreground">
                    {companyName || 'Tu empresa'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-primary-foreground/60">
                    Tu espacio de trabajo centralizado
                  </p>
                  <p className="mt-1 truncate text-[11px] text-primary-foreground/70">
                    RUC / Cédula: {legalIdentifier || 'Pendiente'}
                  </p>
                  <div
                    className="mt-2 flex flex-wrap gap-1"
                    aria-label="Preview company services"
                  >
                    {selectedServices.length > 0 ? (
                      selectedServices.map((service) => (
                        <span
                          key={service}
                          className="max-w-full truncate rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] text-primary-foreground/80"
                        >
                          {service}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-primary-foreground/50">
                        Servicios pendientes
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-2 flex min-w-0 items-start gap-1.5"
                    aria-label="Preview company location"
                  >
                    <MapPin className="mt-0.5 size-3 shrink-0 text-primary-foreground/60" />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-primary-foreground/75">
                        {city || 'Ciudad pendiente'},{' '}
                        {country || 'País pendiente'}
                      </p>
                      <p className="truncate text-[10px] text-primary-foreground/50">
                        {exactLocation || 'Ubicación exacta pendiente'}
                      </p>
                    </div>
                  </div>
                  <div
                    className="mt-2 flex min-w-0 items-center gap-1.5"
                    aria-label="Preview company ERP module"
                  >
                    {SelectedModuleIcon ? (
                      <SelectedModuleIcon className="size-3 shrink-0 text-primary-foreground/60" />
                    ) : null}
                    <span className="truncate text-[10px] text-primary-foreground/60">
                      {selectedModule?.name ?? 'Módulo pendiente'}
                    </span>
                  </div>
                  <div
                    className="mt-2 flex gap-4 items-center justify-center"
                    aria-label="Preview company contact"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Phone className="size-3 shrink-0 text-primary-foreground/60" />
                      <span className="truncate text-[10px] text-primary-foreground/60">
                        {draft.contactPhone || 'Teléfono pendiente'}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Mail className="size-3 shrink-0 text-primary-foreground/60" />
                      <span className="truncate text-[10px] text-primary-foreground/60">
                        {draft.contactEmail || 'Correo pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="border-b px-6 py-5 sm:px-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold lg:hidden">
                <Building2 className="size-4" /> Vimcore
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Sesión iniciada con{' '}
                <span className="text-foreground">{session.user.email}</span>
              </p>
              <p className="shrink-0 text-xs font-medium text-muted-foreground">
                paso {currentStepIndex + 1} / {onboardingSteps.length}
              </p>
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${((currentStepIndex + 1) / onboardingSteps.length) * 100}%`,
                }}
              />
            </div>
          </header>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[250px_minmax(0,1fr)]">
            <nav
              aria-label="Onboarding steps"
              className="border-b p-6 lg:border-b-0 lg:border-r lg:p-8"
            >
              <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-3">
                {stepDetails.map((item, index) => {
                  const Icon = item.icon;
                  const active = index === currentStepIndex;
                  const completed = index < currentStepIndex;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex min-w-max items-center gap-3 rounded-lg p-2 lg:min-w-0',
                        active && 'bg-muted',
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground',
                          active &&
                            'border-primary bg-primary text-primary-foreground',
                          completed &&
                            'border-primary bg-primary/10 text-primary',
                        )}
                      >
                        {completed ? (
                          <Check className="size-4" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </div>
                      <div className="hidden min-w-0 lg:block">
                        <p
                          className={cn(
                            'text-xs font-semibold',
                            active && 'text-foreground',
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </nav>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="mx-auto min-h-0 w-full max-w-xl flex-1 overflow-hidden px-6 py-6 sm:px-10 sm:py-8">
                <h1 className="sr-only">
                  Registro de información de a la empresa
                </h1>
                <div className="mb-6">
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Paso {currentStepIndex + 1}
                  </p>
                  <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                    {step.label}
                  </h2>
                  <p className="mt-2 text-sm text-gray-700">
                    {currentStep === 'account'
                      ? 'Cuéntanos cómo se llama tu empresa.'
                      : currentStep === 'legal'
                        ? 'Ayúdanos a mantener tus datos en orden.'
                        : currentStep === 'services'
                          ? 'Agrega lo que tu empresa hace mejor.'
                          : currentStep === 'address'
                            ? 'Esta ubicación se usará como dirección principal en tus facturas y documentos..'
                            : currentStep === 'contact'
                              ? 'Ingresa tus datos para mantenernos en contacto.'
                              : currentStep === 'palette'
                                ? 'Elige los colores que mejor representen la identidad de tu empresa.'
                                : 'Elige el módulo que mejor representa tu operación.'}
                  </p>
                </div>
                <Card className="border-0 bg-transparent p-0 shadow-none">
                  <CardHeader className="sr-only">
                    <CardTitle>{step.label}</CardTitle>
                    <CardDescription>
                      Completa la información solicitada
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">{renderStep()}</CardContent>
                </Card>
              </div>
              <footer className="flex shrink-0 items-center justify-between border-t bg-background/95 px-6 py-4 backdrop-blur sm:px-10">
                <Button
                  className="rounded-full cursor-pointer border bg-background px-3 py-1.5 text-xs font-medium duration-300 ease-in-out transition-all hover:text-white hover:bg-black text-black"
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={currentStepIndex === 0}
                >
                  <ArrowLeft className="size-4" /> Regresar
                </Button>
                {currentStepIndex === onboardingSteps.length - 1 ? (
                  <Button
                    className="cursor-pointer rounded-3xl px-4 flex items-center justify-center"
                    type="button"
                    onClick={requestCompanyRegistration}
                    disabled={createCompany.isPending}
                  >
                    {createCompany.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creando empresa...
                      </>
                    ) : (
                      <>
                        Revisar y registrar <Check className="size-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="rounded-full text-black cursor-pointer border bg-background px-3 py-1.5 text-xs font-medium duration-300 ease-in-out transition-all hover:text-white hover:bg-black"
                    type="button"
                    onClick={advanceToNextStep}
                  >
                    Siguiente <ArrowRight className="size-4" />
                  </Button>
                )}
              </footer>
            </div>
          </div>
        </section>
      </div>
      {createCompany.isPending ? (
        <div
          className="fixed inset-0 z-50 flex min-h-dvh w-full items-center justify-center bg-slate-950/45 px-6 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-label="Registrando empresa"
        >
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-white/15 bg-white/95 px-6 py-7 text-center text-slate-950 shadow-2xl shadow-black/20">
            <Loader2 className="size-9 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Registrando empresa</p>
              <p className="text-xs text-slate-600">
                Estamos preparando tu workspace. No cierres esta ventana.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog open={isPrivacyDialogOpen} onOpenChange={setIsPrivacyDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Protegemos tu información</DialogTitle>
            <DialogDescription>
              Para registrar tu empresa debes aceptar nuestra política de
              privacidad y cookies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="rounded-xl border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              Revisa cómo usamos y protegemos tus datos antes de crear tu
              espacio de trabajo.
              <Link
                className="ml-1 font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                to="/privacy-policy"
                target="_blank"
                rel="noreferrer"
              >
                Leer política de privacidad
              </Link>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy-policy-consent"
                checked={hasAcceptedPrivacyPolicy}
                onCheckedChange={(checked) =>
                  setHasAcceptedPrivacyPolicy(checked === true)
                }
                aria-describedby="privacy-policy-consent-description"
              />
              <Label
                className="cursor-pointer text-sm font-normal leading-6"
                htmlFor="privacy-policy-consent"
                id="privacy-policy-consent-description"
              >
                Acepto la política de privacidad y cookies de LunaSol.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPrivacyDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmCompanyRegistration}
              disabled={!hasAcceptedPrivacyPolicy}
            >
              Aceptar y registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};
