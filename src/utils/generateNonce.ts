export default function generateNonce() {
	let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 15; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
