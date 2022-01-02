CREATE TABLE IF NOT EXISTS users (
	id SERIAL
);

INSERT INTO users (id) VALUES (1); -- Create default user

CREATE TABLE IF NOT EXISTS videos (
	id SERIAL,
	filename VARCHAR(511) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS user_progress (
	user_id INTEGER NOT NULL,
	video_id INTEGER NOT NULL,
	progress FLOAT NOT NULL,
	PRIMARY KEY (user_id, video_id)
);
