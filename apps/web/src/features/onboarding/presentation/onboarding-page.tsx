import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, MapPin, Palette, Sparkles, Store, Tags, UserRound } from 'lucide-react';

import type { AuthSession } from '../../auth/domain/auth';
import {
  normalizeServices,
  onboardingSteps,
  paletteValues,
} from '../domain/onboarding';
import { useOnboardingStore } from '../infrastructure/onboarding-store';
import { useCreateCompany } from './use-onboarding';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

const stepDetails = [
  { id: 'account', label: 'Tu empresa', description: 'Identidad principal', icon: Building2 },
  { id: 'legal', label: 'Información legal', description: 'Datos fiscales', icon: Tags },
  { id: 'services', label: 'Servicios', description: 'Qué ofreces', icon: Store },
  { id: 'address', label: 'Ubicación', description: 'Dónde operas', icon: MapPin },
  { id: 'contact', label: 'Contacto', description: 'Últimos detalles', icon: UserRound },
] as const;

const paletteLabels = {
  ocean: { name: 'Ocean', description: 'Sereno y profesional', className: 'bg-slate-900' },
  forest: { name: 'Forest', description: 'Natural y confiable', className: 'bg-emerald-700' },
  violet: { name: 'Violet', description: 'Creativo y moderno', className: 'bg-violet-700' },
  sunset: { name: 'Sunset', description: 'Cálido y energético', className: 'bg-orange-600' },
  midnight: { name: 'Midnight', description: 'Elegante y sobrio', className: 'bg-indigo-950' },
} as const;

export const OnboardingPage = ({
  apiBaseUrl,
  session,
}: {
  apiBaseUrl?: string;
  session: AuthSession;
}) => {
  const navigate = useNavigate();
  const draft = useOnboardingStore((state) => state.draft);
  const currentStepIndex = useOnboardingStore((state) => state.currentStepIndex);
  const error = useOnboardingStore((state) => state.error);
  const updateDraft = useOnboardingStore((state) => state.updateDraft);
  const goToNextStep = useOnboardingStore((state) => state.goToNextStep);
  const goToPreviousStep = useOnboardingStore((state) => state.goToPreviousStep);
  const reset = useOnboardingStore((state) => state.reset);
  const createCompany = useCreateCompany(apiBaseUrl);
  const isSubmittingRef = useRef(false);

  const currentStep = onboardingSteps[currentStepIndex];
  const step = stepDetails[currentStepIndex] ?? stepDetails[0];

  const finishOnboarding = async () => {
    if (isSubmittingRef.current || createCompany.isPending) {
      return;
    }

    if (!goToNextStep()) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      await createCompany.mutateAsync({
        name: draft.companyName,
        legalIdentifier: draft.legalIdentifier,
        services: normalizeServices(draft.servicesInput),
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
      });

      reset(session);
      void navigate('/dashboard');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const renderStep = () => {
    if (currentStep === 'account') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input id="company-name" aria-label="Company name" autoFocus placeholder="e.g. Vimcore Labs" value={draft.companyName} onChange={(event) => updateDraft({ companyName: event.target.value })} />
            <p className="text-xs text-muted-foreground">This is the name your team and customers will see.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-primary/20 bg-primary/[0.03] shadow-none"><CardContent className="flex items-center gap-3 p-4"><Building2 className="size-5 text-primary" /><div><p className="text-sm font-medium">Workspace centralizado</p><p className="text-xs text-muted-foreground">Todo empieza aquí.</p></div></CardContent></Card>
            <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-4"><Sparkles className="size-5 text-amber-500" /><div><p className="text-sm font-medium">Listo en minutos</p><p className="text-xs text-muted-foreground">Puedes cambiarlo después.</p></div></CardContent></Card>
          </div>
        </div>
      );
    }

    if (currentStep === 'legal') {
      return <div className="space-y-2"><Label htmlFor="legal-id">Legal or tax identifier</Label><Input id="legal-id" aria-label="Legal or tax identifier" autoFocus placeholder="RFC, NIT, RUC..." value={draft.legalIdentifier} onChange={(event) => updateDraft({ legalIdentifier: event.target.value })} /><p className="text-xs text-muted-foreground">Usaremos este dato para identificar legalmente tu empresa.</p></div>;
    }

    if (currentStep === 'services') {
      return <div className="space-y-2"><Label htmlFor="services">Services</Label><Input id="services" aria-label="Services" autoFocus placeholder="Consultoría, soporte, desarrollo..." value={draft.servicesInput} onChange={(event) => updateDraft({ servicesInput: event.target.value })} /><p className="text-xs text-muted-foreground">Separa cada servicio con una coma.</p></div>;
    }

    if (currentStep === 'address') {
      return <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="country">Country</Label><Input id="country" aria-label="Country" autoFocus placeholder="México" value={draft.country} onChange={(event) => updateDraft({ country: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="city">City</Label><Input id="city" aria-label="City" placeholder="Monterrey" value={draft.city} onChange={(event) => updateDraft({ city: event.target.value })} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="exact-location">Exact location</Label><Input id="exact-location" aria-label="Exact location" placeholder="Av. Constitución 123, Centro" value={draft.exactLocation} onChange={(event) => updateDraft({ exactLocation: event.target.value })} /></div></div>;
    }

    return <div className="space-y-7"><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="contact-phone">Contact phone</Label><Input id="contact-phone" aria-label="Contact phone" autoFocus placeholder="+52 81 5555 0000" value={draft.contactPhone} onChange={(event) => updateDraft({ contactPhone: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="contact-email">Contact email</Label><Input id="contact-email" aria-label="Contact email" type="email" placeholder="hola@tuempresa.com" value={draft.contactEmail} onChange={(event) => updateDraft({ contactEmail: event.target.value })} /></div></div><div className="space-y-3"><div className="flex items-center gap-2"><Palette className="size-4" /><Label htmlFor="palette">Palette</Label></div><select id="palette" className="sr-only" aria-label="Palette" value={draft.paletteId} onChange={(event) => updateDraft({ paletteId: event.target.value as (typeof paletteValues)[number] })}>{paletteValues.map((palette) => <option key={palette} value={palette}>{paletteLabels[palette].name}</option>)}</select><div className="grid gap-3 sm:grid-cols-2">{paletteValues.map((palette) => { const option = paletteLabels[palette]; const selected = draft.paletteId === palette; return <button key={palette} type="button" className={cn('flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent', selected && 'border-primary bg-primary/[0.04] ring-1 ring-primary')} onClick={() => updateDraft({ paletteId: palette })}><span className={cn('size-8 shrink-0 rounded-full shadow-inner', option.className)} /> <span className="min-w-0"><span className="block text-sm font-medium">{option.name}</span><span className="block truncate text-xs text-muted-foreground">{option.description}</span></span>{selected ? <Check className="ml-auto size-4 text-primary" /> : null}</button>; })}</div></div></div>;
  };

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl overflow-hidden rounded-2xl border bg-background shadow-sm">
        <aside className="hidden w-72 shrink-0 flex-col bg-primary p-8 text-primary-foreground lg:flex">
          <div className="flex items-center gap-2 text-sm font-semibold"><div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground text-primary"><Building2 className="size-4" /></div> Vimcore</div>
          <div className="mt-auto"><p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/60">Configura tu espacio</p><h2 className="text-2xl font-semibold leading-tight">Una buena base hace que todo fluya.</h2><p className="mt-4 text-sm leading-6 text-primary-foreground/70">Completa estos datos para preparar un workspace hecho para tu empresa.</p></div>
          <div className="mt-10 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 text-xs leading-5 text-primary-foreground/75">Tus datos quedan protegidos y podrás editarlos desde Configuración.</div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b px-6 py-5 sm:px-10"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-sm font-semibold lg:hidden"><Building2 className="size-4" /> Vimcore</div><p className="text-xs font-medium text-muted-foreground">Signed in as <span className="text-foreground">{session.user.email}</span></p><p className="shrink-0 text-xs font-medium text-muted-foreground">{currentStepIndex + 1} / {onboardingSteps.length}</p></div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((currentStepIndex + 1) / onboardingSteps.length) * 100}%` }} /></div></header>
          <div className="grid flex-1 lg:grid-cols-[190px_minmax(0,1fr)]">
            <nav aria-label="Onboarding steps" className="border-b p-6 lg:border-b-0 lg:border-r lg:p-8"><div className="flex gap-2 overflow-x-auto lg:block lg:space-y-3">{stepDetails.map((item, index) => { const Icon = item.icon; const active = index === currentStepIndex; const completed = index < currentStepIndex; return <div key={item.id} className={cn('flex min-w-max items-center gap-3 rounded-lg p-2 lg:min-w-0', active && 'bg-muted')}><div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground', active && 'border-primary bg-primary text-primary-foreground', completed && 'border-primary bg-primary/10 text-primary')}>{completed ? <Check className="size-4" /> : <Icon className="size-4" />}</div><div className="hidden min-w-0 lg:block"><p className={cn('text-xs font-semibold', active && 'text-foreground')}>{item.label}</p><p className="truncate text-[11px] text-muted-foreground">{item.description}</p></div></div>; })}</div></nav>
            <div className="flex min-w-0 flex-1 flex-col"><div className="mx-auto w-full max-w-xl flex-1 px-6 py-10 sm:px-10 sm:py-14"><h1 className="sr-only">Company onboarding</h1><div className="mb-9"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Paso {currentStepIndex + 1}</p><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{step.label}</h2><p className="mt-2 text-sm text-muted-foreground">{currentStep === 'account' ? 'Cuéntanos cómo se llama tu empresa.' : currentStep === 'legal' ? 'Ayúdanos a mantener tus datos en orden.' : currentStep === 'services' ? 'Agrega lo que tu empresa hace mejor.' : currentStep === 'address' ? 'Dónde podemos encontrar tu operación.' : 'Cómo podemos comunicarnos contigo.'}</p></div><Card className="border-0 bg-transparent p-0 shadow-none"><CardHeader className="sr-only"><CardTitle>{step.label}</CardTitle><CardDescription>Completa la información solicitada</CardDescription></CardHeader><CardContent className="p-0">{renderStep()}</CardContent></Card>{error ? <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}{createCompany.isError ? <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">Unable to create company.</p> : null}</div><footer className="mt-auto flex items-center justify-between border-t px-6 py-5 sm:px-10"><Button type="button" variant="ghost" onClick={goToPreviousStep} disabled={currentStepIndex === 0}><ArrowLeft className="size-4" /> Back</Button>{currentStepIndex === onboardingSteps.length - 1 ? <Button type="button" onClick={() => void finishOnboarding()} disabled={createCompany.isPending}>{createCompany.isPending ? <><Loader2 className="size-4 animate-spin" /> Creating company...</> : <>Create company <Check className="size-4" /></>}</Button> : <Button type="button" onClick={goToNextStep}>Continue <ArrowRight className="size-4" /></Button>}</footer></div>
          </div>
        </section>
      </div>
    </main>
  );
};
