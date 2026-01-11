import { useState } from 'react';
import { api } from '../api';
import './Auth.css';

interface AuthProps {
	onAuthenticated: () => void;
}

export function Auth({ onAuthenticated }: AuthProps) {
	const [loading, setLoading] = useState(false);
	const [pin, setPin] = useState<string | null>(null);
	const [code, setCode] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const startAuth = async () => {
		setLoading(true);
		setError(null);

		try {
			const { pin, code } = await api.startAuth();
			setPin(pin);
			setCode(code);

			// Listen for auth completion message from popup
			const messageHandler = async (event: MessageEvent) => {
				console.log('Received message:', event.origin, event.data);

				// Only accept messages from plex.tv or app.plex.tv
				if (!event.origin.includes('plex.tv')) {
					console.log('Ignoring message from non-Plex origin:', event.origin);
					return;
				}

				if (event.data?.type === 'AUTH_COMPLETE' && event.data?.response?.authToken) {
					console.log('Auth complete! Got token, calling completeAuth');
					window.removeEventListener('message', messageHandler);
					// Use the token directly from the popup
					try {
						const result = await api.completeAuth(event.data.response.authToken);
						if (result.authenticated) {
							onAuthenticated();
						}
					} catch (err) {
						setError(err instanceof Error ? err.message : 'Authentication failed');
						setLoading(false);
						setPin(null);
						setCode(null);
					}
				}
			};

			window.addEventListener('message', messageHandler);

			// Poll for manual PIN entry at plex.tv/link
			pollForAuth(pin, messageHandler);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start authentication');
			setLoading(false);
		}
	};

	const pollForAuth = async (pinCode: string, messageHandler?: (event: MessageEvent) => void) => {
		const maxAttempts = 60; // Poll for 5 minutes
		let attempts = 0;

		const poll = async () => {
			if (attempts >= maxAttempts) {
				setError('Authentication timed out. Please try again.');
				setLoading(false);
				if (messageHandler) {
					window.removeEventListener('message', messageHandler);
				}
				return;
			}

			try {
				const result = await api.checkAuth(pinCode);

				if (result.authenticated) {
					if (messageHandler) {
						window.removeEventListener('message', messageHandler);
					}
					onAuthenticated();
				} else {
					attempts++;
					setTimeout(poll, 5000); // Poll every 5 seconds
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Authentication failed');
				setLoading(false);
				setPin(null); // Reset PIN so user can try again
				setCode(null);
				if (messageHandler) {
					window.removeEventListener('message', messageHandler);
				}
			}
		};

		poll();
	};

	return (
		<div className="auth-container">
			<div className="auth-card">
				<h1>Ralf</h1>
				<p className="auth-subtitle">Your Rickyflix AI Assistant</p>
				<p className="auth-description">
					Connect with your Plex account to start requesting movies, TV shows, and get
					personalized recommendations from Rickyflix.
				</p>

				{error && <div className="error-message">{error}</div>}

				{!pin && (
					<button onClick={startAuth} disabled={loading} className="auth-button">
						{loading ? 'Starting...' : 'Sign in with Plex'}
					</button>
				)}

				{code && (
					<div className="auth-waiting">
						<div className="spinner"></div>
						<p>Waiting for Plex authentication...</p>
						<p className="pin-code">{code.split('').join(' ')}</p>
						<p className="auth-hint">
							Go to <strong>plex.tv/link</strong> and enter this code
						</p>
						<a href="https://plex.tv/link" target="_blank" rel="noopener noreferrer" className="link-button">
							Open plex.tv/link
						</a>
					</div>
				)}
			</div>
		</div>
	);
}
