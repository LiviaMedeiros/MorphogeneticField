CREATE TABLE IF NOT EXISTS channels (channelId TEXT PRIMARY KEY, prefix TEXT);
CREATE TABLE IF NOT EXISTS videos (videoId TEXT PRIMARY KEY, channelId TEXT, authorName TEXT, published TEXT, updated TEXT);
