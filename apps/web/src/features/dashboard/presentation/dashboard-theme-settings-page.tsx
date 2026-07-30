import { Check, LoaderCircle, Palette } from 'lucide-react';
import { useState } from 'react';

import {
  Card,
  CardContent,
} from '../../../shared/ui/card';
import type { PaletteId } from '../../onboarding/domain/onboarding';
import { paletteValues } from '../../onboarding/domain/onboarding';
import {
  usePalettePreference,
  useUpdatePalettePreference,
} from '../../onboarding/presentation/use-onboarding';
import {
  applyPaletteToDocument,
} from '../../theme/domain/palette';
import { usePalette } from '../../theme/presentation/theme-context';

const paletteLabels: Record<PaletteId, { title: string; subtitle: string }> = {
  ocean: { title: 'Neutral', subtitle: 'Blanco y negro por defecto' },
  forest: { title: 'Soft Graphite', subtitle: 'Neutro suave con contraste medio' },
  violet: { title: 'Paper', subtitle: 'Base clara con sombras suaves' },
  sunset: { title: 'Stone', subtitle: 'Neutro calido y sobrio' },
  midnight: { title: 'Ink', subtitle: 'Contraste alto y look editorial' },
};

const palettePreviews: Record<PaletteId, { start: string; end: string; chip: string }> = {
  ocean: { start: '#111111', end: '#9f9f9f', chip: '#ffffff33' },
  forest: { start: '#0f172a', end: '#475569', chip: '#ffffff26' },
  violet: { start: '#3b0764', end: '#ec4899', chip: '#ffffff2e' },
  sunset: { start: '#7c2d12', end: '#fb923c', chip: '#ffffff2e' },
  midnight: { start: '#020617', end: '#334155', chip: '#ffffff24' },
};

export const DashboardThemeSettingsPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const palettePreference = usePalettePreference(apiBaseUrl);
  const updatePalettePreference = useUpdatePalettePreference(apiBaseUrl);
  const { paletteId } = usePalette();
  const [pendingPaletteId, setPendingPaletteId] = useState<PaletteId | null>(null);

  const selectedPaletteId =
    pendingPaletteId ?? palettePreference.data?.paletteId ?? paletteId;

  const handlePaletteChange = async (nextPaletteId: PaletteId) => {
    if (nextPaletteId === selectedPaletteId || updatePalettePreference.isPending) {
      return;
    }

    const previousPaletteId = selectedPaletteId;

    setPendingPaletteId(nextPaletteId);
    applyPaletteToDocument(nextPaletteId);

    try {
      await updatePalettePreference.mutateAsync(nextPaletteId);
    } catch {
      applyPaletteToDocument(previousPaletteId);
    } finally {
      setPendingPaletteId(null);
    }
  };

  return (
    <div className="relative mx-auto flex max-w-6xl flex-col gap-5 pb-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Configuracion</p>
        <h1 className="text-3xl font-semibold tracking-tight">Paleta de colores</h1>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {paletteValues.map((item) => {
              const preview = palettePreviews[item];
              const isSelected = selectedPaletteId === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => void handlePaletteChange(item)}
                  className={[
                    'group rounded-xl border text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md',
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                  ].join(' ')}
                  >
                  <div
                    className="relative h-36 rounded-t-xl p-4"
                    style={{
                      background: `linear-gradient(135deg, ${preview.start} 0%, ${preview.end} 100%)`,
                      color: '#ffffff',
                    }}
                  >
                    <div className="flex items-center justify-between text-white/90">
                      <Palette className="size-4" />
                      {isSelected ? <Check className="size-4" /> : null}
                    </div>
                    <div className="mt-8 space-y-2 text-white">
                      <div className="h-3 w-2/3 rounded-full bg-white/80" />
                      <div className="h-3 w-1/2 rounded-full bg-white/60" />
                      <div className="h-3 w-1/3 rounded-full bg-white/40" />
                    </div>
                    <div className="absolute inset-x-4 bottom-4 flex gap-2">
                      <span className="h-8 flex-1 rounded-md border border-white/30" style={{ background: preview.chip }} />
                      <span className="h-8 w-10 rounded-md border border-white/30 bg-black/20" />
                    </div>
                  </div>
                  <div className="space-y-1 p-4">
                    <div className="font-medium">{paletteLabels[item].title}</div>
                    <div className="text-sm text-muted-foreground">{paletteLabels[item].subtitle}</div>
                  </div>
                </button>
              );
            })}
        </CardContent>
      </Card>

      {pendingPaletteId ? (
        <div className="absolute inset-0 z-20 flex h-dvh w-full items-center justify-center bg-neutral-500/40 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-background px-6 py-5 shadow-lg">
            <LoaderCircle className="size-8 animate-spin" />
            <div className="text-sm font-medium">Aplicando paleta...</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
