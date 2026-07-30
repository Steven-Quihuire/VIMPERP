const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

export const getApiBaseUrl = () => {
  const configuredBaseUrl =
    typeof import.meta.env.VITE_API_BASE_URL === 'string'
      ? import.meta.env.VITE_API_BASE_URL
      : undefined;

  if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  return '/api';
};
