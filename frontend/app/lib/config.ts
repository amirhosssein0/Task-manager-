const isServer = typeof window === 'undefined';

const publicBase =
	process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8089';

const internalBase = process.env.API_BASE_INTERNAL || publicBase;

export const API_BASE = isServer ? internalBase : publicBase;


