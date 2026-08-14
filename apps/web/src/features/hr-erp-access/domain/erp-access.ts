import { z } from 'zod';

export type PendingErpAccessInvitation = {
  id: string;
  companyId: string;
  employeeId: string;
  inviteeEmail: string;
  createdAt: string;
  expiresAt: string;
};

export const invitationFormSchema = z.object({
  employeeId: z.string().trim().min(1, 'El empleado es obligatorio.'),
  inviteeEmail: z.string().trim().toLowerCase().email('El correo de la persona invitada debe ser válido.'),
});

export type InvitationFormValues = z.output<typeof invitationFormSchema>;

export type CreateErpAccessInvitationInput = {
  companyId: string;
  employeeId: string;
  inviteeEmail: string;
};

export const acceptInvitationFormSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    const password = values.password.trim();
    const confirmPassword = values.confirmPassword.trim();

    if (!password && !confirmPassword) {
      return;
    }

    if (password.length < 8) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'La contraseña debe tener al menos 8 caracteres.',
      });
    }

    if (password !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Las contraseñas deben coincidir.',
      });
    }
  });

export type AcceptInvitationFormValues = z.output<typeof acceptInvitationFormSchema>;

export type AcceptErpAccessInvitationInput = {
  token: string;
  password?: string;
};

export const toCreateErpAccessInvitationInput = (
  companyId: string,
  values: InvitationFormValues,
): CreateErpAccessInvitationInput => ({
  companyId,
  employeeId: values.employeeId.trim(),
  inviteeEmail: values.inviteeEmail.trim().toLowerCase(),
});

export const createAcceptInvitationInput = (
  token: string,
  values: AcceptInvitationFormValues,
): AcceptErpAccessInvitationInput => {
  const password = values.password.trim();

  if (!password) {
    return { token };
  }

  return { token, password };
};

export const sortInvitationsByExpiresAt = (
  invitations: PendingErpAccessInvitation[],
) => {
  return [...invitations].sort(
    (left, right) =>
      new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
  );
};
