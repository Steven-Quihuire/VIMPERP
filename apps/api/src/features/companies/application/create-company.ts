import type {
  CompanyOnboardingGateway,
  CreateCompanyInput,
} from '../domain/company';

const normalizeServices = (services: string[]) => {
  return services.map((service) => service.trim()).filter((service) => service.length > 0);
};

export const createCreateCompany = (gateway: CompanyOnboardingGateway) => {
  return async (input: CreateCompanyInput) => {
    return gateway.createCompany({
      ...input,
      name: input.name.trim(),
      legalIdentifier: input.legalIdentifier.trim(),
      services: normalizeServices(input.services),
      address: {
        country: input.address.country.trim(),
        city: input.address.city.trim(),
        exactLocation: input.address.exactLocation.trim(),
      },
      contact: {
        phone: input.contact.phone.trim(),
        email: input.contact.email.trim().toLowerCase(),
      },
      branches: input.branches.map((branch) => ({
        name: branch.name.trim(),
        ...(branch.locale ? { locale: branch.locale.trim() } : {}),
      })),
    });
  };
};
