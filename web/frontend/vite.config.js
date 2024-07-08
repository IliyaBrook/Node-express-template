import { defineConfig, loadEnv } from 'vite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
dotenv.config();

const FRONTEND_PORT = process.env.FRONTEND_PORT;

if (
	process.env.npm_lifecycle_event === 'build' &&
	!process.env.CI &&
	!process.env.SHOPIFY_API_KEY
) {
	console.warn(
		'\nBuilding the frontend app without an API key. The frontend build will not run without an API key. Set the SHOPIFY_API_KEY environment variable when running the build command.\n',
	);
}

const proxyOptions = {
	target: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
	changeOrigin: false,
	secure: true,
	ws: false,
};

const host = process.env.HOST
	? process.env.HOST.replace(/https?:\/\//, '')
	: 'localhost';

let hmrConfig;
if (host === 'localhost') {
	hmrConfig = {
		protocol: 'ws',
		host: 'localhost',
		port: 64999,
		clientPort: 64999,
	};
} else {
	hmrConfig = {
		protocol: 'wss',
		host: host,
		port: FRONTEND_PORT,
		clientPort: 443,
	};
}


// noinspection JSCheckFunctionSignatures
export default defineConfig(({ mode }) => {
	// VITE_APP client environments
	const {
		VITE_APP_HOST:HOST,
		VITE_APP_PORT:PORT,
		VITE_APP_PUBLIC_URL:URL
	} = loadEnv(mode, process.cwd());
	
	return {
		root: dirname(fileURLToPath(import.meta.url)),
		plugins: [react()],
		define: {
			"process.env.SHOPIFY_API_KEY": JSON.stringify(process.env.SHOPIFY_API_KEY),
		},
		resolve: {
			preserveSymlinks: true,
		},
		server: {
			host: HOST || "localhost",
			port: PORT || process.env.FRONTEND_PORT,
			hmr: hmrConfig,
			proxy: {
				"^/(\\?.*)?$": proxyOptions,
				"^/api(/|(\\?.*)?$)": proxyOptions,
			},
		}
	}
});