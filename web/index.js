import { join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import serveStatic from 'serve-static';
import cors from 'cors';
import shopify from './shopify.js';
import webhooks from './webhooks.js';
import { apiRoutes } from './routes/index.js';



const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);
const STATIC_PATH = process.env.NODE_ENV === 'production'
	? `${process.cwd()}/frontend/dist`
	: `${process.cwd()}/frontend/`;



const app = express();
app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
	shopify.config.auth.callbackPath,
	shopify.auth.callback(),
	shopify.redirectToShopifyOrAppRoot()
);

apiRoutes.forEach(route => app.use('/api/import_cart', route));

app.post(
	shopify.config.webhooks.path,
	shopify.processWebhooks({ webhookHandlers: webhooks })
);

app.use('/api/*', shopify.validateAuthenticatedSession());
app.use(serveStatic(STATIC_PATH, { index: false }));
app.use('/*', shopify.ensureInstalledOnShop(), async (_req, res) => {
	return res.set('Content-Type', 'text/html').send(readFileSync(join(STATIC_PATH, 'index.html')));
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
