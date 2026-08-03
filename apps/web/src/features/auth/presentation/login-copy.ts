export type LoginCopy = {
  title: string;
  description__upercase: string;
  description: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordHint: string;
  submitLabel: string;
  submittingLabel: string;
  footer: string;
  error: string;
};

// El copy vive en un módulo para reemplazarlo luego con un resolver español/inglés.
export const loginCopy: LoginCopy = {
  title: 'Iniciar sesión',
  description__upercase:
    'Ingresa nuevamente a tu sistema listo para comenzar a trabajar.',
  description:
    'Accede a tu espacio de trabajo y mantené tu operación en marcha.',
  identifierLabel: 'Correo o usuario',
  identifierPlaceholder: 'Ingresa tu correo',
  passwordLabel: 'Contraseña',
  passwordPlaceholder: 'Ingresá tu contraseña',
  passwordHint: 'Acceso seguro',
  submitLabel: 'Iniciar sesión',
  submittingLabel: 'Iniciando sesión...',
  footer: 'Acceso seguro al espacio de trabajo',
  error: 'Las credenciales no son válidas',
};
