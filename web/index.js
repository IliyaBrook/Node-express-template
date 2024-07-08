import { join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import serveStatic from 'serve-static';
import cors from 'cors';
import shopify from './shopify.js';
import webhooks from './webhooks.js';

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH =
	process.env.NODE_ENV === 'production'
		? `${process.cwd()}/frontend/dist`
		: `${process.cwd()}/frontend/`;

const app = express();

app.use(cors({
	origin: '*'
}));

app.use(express.json());

// add shop query parameter to all requests function if shop query param not exist
const addDefaultShopParam = (req, res, next) => {
	const isApiRequest = req.path.startsWith('/api');
	if (!req.query.shop && !isApiRequest) {
		req.query.shop = process.env.SHOP;
	}
	next();
};


app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
	shopify.config.auth.callbackPath,
	shopify.auth.callback(),
	shopify.redirectToShopifyOrAppRoot()
);

// route to import cart
app.post('/api/import_cart', (req, res) => {
	const customerId = req.body.customer_id;
	console.log("customerId:", customerId)
	console.log("req:", req)
	
	const mockedData = {
		items: [
			{ id: 1, title: 'Product 1', quantity: 2 },
			{ id: 2, title: 'Product 2', quantity: 1 }
		]
	}
	
	res.json(mockedData);
});

app.post(
	shopify.config.webhooks.path,
	shopify.processWebhooks({ webhookHandlers: webhooks })
);

// add shop query parameter to all requests
app.use(addDefaultShopParam);

// validate the session for all /api requests
app.use('/api/*', shopify.validateAuthenticatedSession());

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use('/*', shopify.ensureInstalledOnShop(), async (_req, res) => {
	return res.set('Content-Type', 'text/html').send(readFileSync(join(STATIC_PATH, 'index.html')));
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
