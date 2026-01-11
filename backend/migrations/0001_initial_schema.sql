-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  plex_user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  tautulli_user_id INTEGER,
  created_at INTEGER NOT NULL,
  last_login INTEGER
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  default_quality_profile_id INTEGER,
  default_root_folder TEXT,
  auto_search BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Media requests tracking
CREATE TABLE IF NOT EXISTS media_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'series')),
  title TEXT NOT NULL,
  year INTEGER,
  tmdb_id INTEGER,
  tvdb_id INTEGER,
  imdb_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'added', 'failed', 'exists')) DEFAULT 'pending',
  requested_at INTEGER NOT NULL,
  completed_at INTEGER,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_requests_user_id ON media_requests(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_requests_status ON media_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_plex_id ON users(plex_user_id);
