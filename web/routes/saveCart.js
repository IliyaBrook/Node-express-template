import prisma from '../prisma/index.js';
import { Router } from 'express';
export const router = Router();


router.post('/save', async (req, res) => {
	const { customer_id, products } = req.body;
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

export default router;