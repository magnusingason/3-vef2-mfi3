-- Útfæra schema
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
  id serial primary key,
  username character varying(255) NOT NULL,
  password character varying(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS events(
  id serial primary key,
  name  varchar(64) NOT NULL UNIQUE,
  slug varchar(256) NOT NULL,
  description varchar(400) not null,
  created timestamp with time zone not null default current_timestamp
);

CREATE TABLE IF NOT EXISTS signup (
  id serial primary key,
  name  varchar(64) NOT NULL,
  comment varchar(400),
  created timestamp with time zone not null default current_timestamp,
  event integer NOT NULL
);

-- Lykilorð: "123"
INSERT INTO users (username, password) VALUES ('admin', '$2a$11$pgj3.zySyFOvIQEpD7W6Aund1Tw.BFarXxgLJxLbrzIv/4Nteisii');