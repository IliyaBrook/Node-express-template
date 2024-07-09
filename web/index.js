import { join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import serveStatic from 'serve-static';
import cors from 'cors';
import shopify from './shopify.js';
import webhooks from './webhooks.js';
import prisma from './prisma/index.js';

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);
const STATIC_PATH = process.env.NODE_ENV === 'production'
	? `${process.cwd()}/frontend/dist`
	: `${process.cwd()}/frontend/`;

const addDefaultShopParam = (req, res, next) => {
	if (!req.query.host) {
		req.query.host = req.hostname;
	}
	if (!req.query.shop) {
		req.query.shop = process.env.SHOP;
	}
	next();
};

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

app.post('/api/import_cart/save', async (req, res) => {
	const { customer_id, products } = req.body;
	console.log("customer_id: ", customer_id);
	console.log("products: ", products);
	
	try {
		await prisma.cart.upsert({
			where: { userId: customer_id },
			update: { products },
			create: { userId: customer_id, products },
		});
		res.json({ message: 'saved', items: products });
	} catch (error) {
		console.error('Error saving cart:', error);
		res.status(500).json({ error: 'Error saving cart' });
	}
});

app.post('/api/import_cart/get', async (req, res) => {
	console.log('req body:', req.body);
	const { customer_id } = req.body;
	console.log("customer_id: ", customer_id);
	
	try {
		const cart = await prisma.cart.findFirst({
			where: { userId: customer_id },
		});
		res.json(cart ? { items: cart.products } : { items: [] });
	} catch (error) {
		console.error('Error fetching cart:', error);
		res.status(500).json({ error: 'Error fetching cart' });
	}
});

app.post(
	shopify.config.webhooks.path,
	shopify.processWebhooks({ webhookHandlers: webhooks })
);

app.use('/api/*', shopify.validateAuthenticatedSession());
app.use(addDefaultShopParam);
app.use(serveStatic(STATIC_PATH, { index: false }));
app.use('/*', shopify.ensureInstalledOnShop(), async (_req, res) => {
	return res.set('Content-Type', 'text/html').send(readFileSync(join(STATIC_PATH, 'index.html')));
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
