import { json, siteSettings } from './lib/store.mjs';

export default async () => json(await siteSettings());
