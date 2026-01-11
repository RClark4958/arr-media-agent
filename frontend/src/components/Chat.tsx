import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { Message, Recommendation } from '../types';
import { MediaCard } from './MediaCard';
import './Chat.css';
import './MediaCard.css';

interface ChatProps {
	onLogout: () => void;
}

const SUGGESTED_PROMPTS = [
	"What movies do you recommend for me?",
	"Add The Office to my library",
	"Search for Inception",
	"What have I been watching lately?",
	"Request Dune Part Two",
	"Show me my watch history",
];

export function Chat({ onLogout }: ChatProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(true);
	const [currentRecommendations, setCurrentRecommendations] = useState<Recommendation[]>([]);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		loadHistory();
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const loadHistory = async () => {
		try {
			const history = await api.getHistory();
			// Filter out system messages for display
			const userMessages = history.filter((m) => m.role !== 'system');
			setMessages(userMessages);
			setShowSuggestions(userMessages.length === 0);
		} catch (err) {
			console.error('Failed to load history:', err);
		}
	};

	const sendMessage = async (text?: string) => {
		const messageText = text || input.trim();
		if (!messageText) return;

		setInput('');
		setShowSuggestions(false);

		// Add user message
		const userMessage: Message = { role: 'user', content: messageText };
		setMessages((prev) => [...prev, userMessage]);

		setLoading(true);

		try {
			const response = await api.sendMessage(messageText);

			// Add assistant response
			const assistantMessage: Message = {
				role: 'assistant',
				content: response.response,
			};
			setMessages((prev) => [...prev, assistantMessage]);

			// Update recommendations if present
			if (response.recommendations && response.recommendations.length > 0) {
				setCurrentRecommendations(response.recommendations);
			}
		} catch (err) {
			const errorMessage: Message = {
				role: 'assistant',
				content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
			};
			setMessages((prev) => [...prev, errorMessage]);

			if (err instanceof Error && err.message === 'Session expired') {
				setTimeout(onLogout, 2000);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		sendMessage();
	};

	const handleSuggestionClick = (suggestion: string) => {
		sendMessage(suggestion);
	};

	return (
		<div className="chat-container">
			<div className="chat-header">
				<h1>Ralf</h1>
				<p className="chat-subtitle">Rickyflix AI Assistant</p>
				<button onClick={onLogout} className="logout-button">
					Sign Out
				</button>
			</div>

			<div className="chat-messages">
				{messages.length === 0 && !showSuggestions && (
					<div className="empty-state">
						<h2>Welcome to Ralf!</h2>
						<p>Your Rickyflix AI assistant. Ask me to find movies, TV shows, or get personalized recommendations.</p>
					</div>
				)}

				{messages.map((message, index) => (
					<div key={index} className={`message message-${message.role}`}>
						<div className="message-avatar">
							{message.role === 'user' ? '👤' : '🤖'}
						</div>
						<div className="message-content">{message.content}</div>
					</div>
				))}

				{loading && (
					<div className="message message-assistant">
						<div className="message-avatar">🤖</div>
						<div className="message-content">
							<div className="typing-indicator">
								<span></span>
								<span></span>
								<span></span>
							</div>
						</div>
					</div>
				)}


			{currentRecommendations.length > 0 && (
				<div className="media-cards-container">
					<h2 className="media-cards-header">Recommendations for You</h2>
					<div className="media-cards-grid">
						{currentRecommendations.map((media, index) => (
							<MediaCard
								key={index}
								media={media}
								onRequest={(media) => sendMessage(`Request ${media.title} (${media.year})`)}
							/>
						))}
					</div>
				</div>
			)}
				<div ref={messagesEndRef} />
			</div>

			{showSuggestions && messages.length === 0 && (
				<div className="suggestions">
					<p className="suggestions-title">Try asking:</p>
					<div className="suggestions-grid">
						{SUGGESTED_PROMPTS.map((prompt, index) => (
							<button
								key={index}
								onClick={() => handleSuggestionClick(prompt)}
								className="suggestion-button"
							>
								{prompt}
							</button>
						))}
					</div>
				</div>
			)}

			<form onSubmit={handleSubmit} className="chat-input-form">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Ask for a movie, TV show, or recommendation..."
					className="chat-input"
					disabled={loading}
				/>
				<button type="submit" disabled={loading || !input.trim()} className="send-button">
					Send
				</button>
			</form>
		</div>
	);
}
