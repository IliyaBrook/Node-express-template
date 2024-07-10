import prisma from '../prisma/index.js';
import { Router } from 'express';
export const router = Router();


router.post('/get', async (req, res) => {
	const { customer_id } = req.body;
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

export default router;