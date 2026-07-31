export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type HttpClient = {
  get: <T>(path: string) => Promise<T>;
  post: <TBody>(path: string, body?: TBody) => Promise<Response>;
  patch: <TBody>(path: string, body: TBody) => Promise<Response>;
  delete: (path: string) => Promise<Response>;
};

const readErrorMessage = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await response.json()) as {
      error?: { message?: string };
    };

    return body.error?.message ?? 'Request failed';
  }

  return 'Request failed';
};

export const createHttpClient = (baseUrl: string): HttpClient => ({
  get: async <T>(path: string) => {
    const response = await fetch(`${baseUrl}${path}`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new HttpError(await readErrorMessage(response), response.status);
    }

    return (await response.json()) as T;
  },
  post: async <TBody>(path: string, body?: TBody) => {
    const requestInit: RequestInit = {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    if (body !== undefined) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, requestInit);

    if (!response.ok) {
      throw new HttpError(await readErrorMessage(response), response.status);
    }

    return response;
  },
  patch: async <TBody>(path: string, body: TBody) => {
    const requestInit: RequestInit = {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    };

    const response = await fetch(`${baseUrl}${path}`, requestInit);

    if (!response.ok) {
      throw new HttpError(await readErrorMessage(response), response.status);
    }

    return response;
  },
  delete: async (path: string) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new HttpError(await readErrorMessage(response), response.status);
    }

    return response;
  },
});
