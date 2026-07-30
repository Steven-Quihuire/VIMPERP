import { LogOut, ShieldUser } from 'lucide-react';

import { useLogout } from '../../auth/presentation/use-auth';
import { Button } from '../../../shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card';

export const DashboardProfileSettingsPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const logout = useLogout(apiBaseUrl);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 pb-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Configuracion</p>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldUser className="size-5" />
            Sesion actual
          </CardTitle>
          <CardDescription>Acciones relacionadas con tu cuenta activa.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Cerrar sesion</p>
            <p className="text-sm text-muted-foreground">Finaliza tu sesion actual de administrador.</p>
          </div>
          <Button variant="destructive" onClick={() => logout.mutate()}>
            <LogOut />
            Cerrar sesion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
