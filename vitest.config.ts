import { defineConfig } from 'vitest/config';

export default defineConfig({
	// n8n-workflow ships sourcemaps whose sources are not published, which makes Vite warn
	// once per module on every run. Nothing actionable, so keep the output readable.
	logLevel: 'error',
	test: {
		include: ['test/**/*.test.ts'],
	},
});
