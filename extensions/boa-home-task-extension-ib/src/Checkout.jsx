import {
	Banner,
	useApi,
	useTranslate,
	reactExtension,
	BlockStack,
	Button,
	Text,
	Form,
	ChoiceList,
	Choice,
	useCartLines,
	BlockSpacer,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect, useState } from 'react';

export default reactExtension(
	'purchase.checkout.block.render',
	() => <Extension />,
);

function Extension() {
	const translate = useTranslate();
	const { buyerIdentity, extension, sessionToken: getSessionToken } = useApi();
	const cartLines = useCartLines();
	const userData = buyerIdentity?.customer?.current;
	const [savedProducts, setSavedProducts] = useState([]);
	const [selectedProducts, setSelectedProducts] = useState([]);
	const [message, setMessage] = useState('');
	const [showWarning, setShowWarning] = useState(false);
	
	const getProxyUrl = async () => {
		return extension?.scriptUrl.match(/^(https:\/\/[^\/]+\.com)/)?.[0];
	};
	
	useEffect(() => {
		async function fetchSavedCart() {
			try {
				if (userData) {
					const sessionToken = await getSessionToken.get();
					const proxyUrl = await getProxyUrl();
					
					const response = await fetch(`${proxyUrl}/api/import_cart/get`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${sessionToken}`,
						},
						body: JSON.stringify({
							customer_id: userData.id,
						}),
					});
					if (!response.ok) {
						console.error('Failed to fetch saved cart')
					}
					
					const data = await response.json();
					setSavedProducts(data.items);
				}
			} catch (error) {
				throw new Error('Error fetching saved cart');
			}
		}
		
		fetchSavedCart();
	}, [userData, extension, getSessionToken]);
	
	const saveCart = async (sessionToken, proxyUrl, productsToSaveIds) => {
		
		const productsToSave = cartLines.filter((line) => productsToSaveIds.includes(line.merchandise.id))
			.map(line => ({ id: line.merchandise.id, quantity: line.quantity }));
		
		const response = await fetch(`${proxyUrl}/api/import_cart/save`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${sessionToken}`,
			},
			body: JSON.stringify({
				customer_id: userData.id,
				products: productsToSave,
			}),
		});
		return response.json();
	};
	
	const onSaveCart = async () => {
		const sessionToken = await getSessionToken.get();
		const proxyUrl = await getProxyUrl();
		const productsToSave = selectedProducts;
		
		if (productsToSave.length === 0) {
			setMessage(translate('no_products_detected'));
			return;
		}
		
		const data = await saveCart(sessionToken, proxyUrl, productsToSave);
		setMessage(data.message === 'saved' ? translate('cart_saved') : "" );
		setSavedProducts(data.items);
	};
	
	const handleSaveCart = async () => {
		try {
			if (savedProducts.length > 0) {
				setShowWarning(true);
				return;
			}
			await onSaveCart();
		} catch (error) {
			throw new Error('Error saving cart');
		}
	};
	
	const handleConfirmSave = async () => {
		try {
			await onSaveCart();
			setShowWarning(false);
		} catch (error) {
			throw new Error('Error saving cart');
		}
	};
	
	if (!userData) {
		return (
			<Banner>
				{translate('login_to_save_cart')}
			</Banner>
		);
	}
	
	return (
		<BlockStack spacing='loose'>
			<Form onSubmit={handleSaveCart}>
				<Banner title={translate('save_cart')}>
					<ChoiceList
						title={translate('products')}
						name='products'
						allowMultiple
						value={selectedProducts}
						onChange={(value) => {
							setSelectedProducts(value);
						}}
					>
						<BlockSpacer spacing='loose' />
						<BlockStack>
							{cartLines?.length > 0 ? cartLines.map((line) => (
								<Choice disabled={showWarning} id={line.merchandise.id} key={line.id}>
									{line.merchandise.title} (quantity: {line.quantity})
								</Choice>
							)) : []}
						</BlockStack>
					</ChoiceList>
					<BlockSpacer spacing='loose' />
					<Button disabled={showWarning} accessibilityRole='submit'>{translate('save_cart')}</Button>
					<BlockSpacer spacing='loose' />
					{message && <Text>{message}</Text>}
				</Banner>
			</Form>
			{showWarning && (
				<Banner title='Warning'>
					<BlockSpacer spacing='loose' />
					<Text>{translate('overwrite_warning')}</Text>
					<BlockSpacer spacing='loose' />
					<Button onPress={handleConfirmSave}>{translate('confirm_save')}</Button>
				</Banner>
			)}
		</BlockStack>
	);
}
