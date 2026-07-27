export type HealthStatus = {
  status: 'ok';
};

export type HealthGateway = {
  ping: () => Promise<void>;
};
