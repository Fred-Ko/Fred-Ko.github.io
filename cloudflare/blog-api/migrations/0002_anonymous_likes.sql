CREATE TABLE anonymous_likes (
  post_id TEXT NOT NULL,
  actor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, actor_hash)
);
