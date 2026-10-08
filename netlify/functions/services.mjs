import { json, services } from './lib/store.mjs';
export default async () => json((await services()).filter((service) => service.active !== false));
