CREATE TABLE recent_views (
  post_id TEXT NOT NULL,
  actor_hash TEXT NOT NULL,
  viewed_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, actor_hash)
);
