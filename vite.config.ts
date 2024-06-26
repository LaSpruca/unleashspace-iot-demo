import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import process from 'node:process';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: process.env.NODE_ENV === 'production' ? ['@carbon/charts'] : []
	}
});
