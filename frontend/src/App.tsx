import { useState } from 'react';
import { Auth } from './components/Auth';
import { Chat } from './components/Chat';
import { api } from './api';
import './App.css';

function App() {
	const [authenticated, setAuthenticated] = useState(api.isAuthenticated());

	const handleAuthenticated = () => {
		setAuthenticated(true);
	};

	const handleLogout = () => {
		api.logout();
		setAuthenticated(false);
	};

	return <>{authenticated ? <Chat onLogout={handleLogout} /> : <Auth onAuthenticated={handleAuthenticated} />}</>;
}

export default App;
