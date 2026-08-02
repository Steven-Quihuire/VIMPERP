import type { AuthSession } from '../../auth/domain/auth';
import { createBlockedCompanyViewModel } from '../domain/dashboard';
import { Button } from '../../../shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card';

export const BlockedCompanyPage = ({ session }: { session: AuthSession }) => {
  if (!session.activeCompany || session.activeCompany.status === 'active') {
    return null;
  }

  const blockedCompany = createBlockedCompanyViewModel(session.activeCompany.status);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-4">
      <Card>
        <CardHeader>
          <CardDescription>Acceso temporalmente limitado</CardDescription>
          <CardTitle>
            <h1 className="text-3xl font-semibold tracking-tight">
              {blockedCompany.title}
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{blockedCompany.body}</p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <a href={blockedCompany.supportHref}>Contactar soporte</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
