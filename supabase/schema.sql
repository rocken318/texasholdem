-- supabase/schema.sql

create table if not exists rooms (
  id              text primary key,
  join_code       text unique not null,
  host_player_id  text not null,
  status          text not null default 'lobby',
  format          text not null default 'cash',
  settings        jsonb not null default '{}',
  created_at      bigint not null
);

create table if not exists players (
  id              text primary key,
  room_id         text not null references rooms(id),
  display_name    text not null,
  chips           integer not null default 0,
  status          text not null default 'waiting',
  seat_index      integer,
  is_host         boolean not null default false,
  joined_at       bigint not null
);

create table if not exists hands (
  id              text primary key,
  room_id         text not null references rooms(id),
  hand_number     integer not null,
  dealer_seat     integer not null,
  community_cards jsonb not null default '[]',
  pot             integer not null default 0,
  side_pots       jsonb not null default '[]',
  street          text not null default 'preflop',
  current_seat    integer,
  current_bet     integer not null default 0,
  deck            jsonb not null default '[]',
  winner_ids      jsonb,
  started_at      bigint not null,
  finished_at     bigint
);

create table if not exists hand_players (
  id              text primary key,
  hand_id         text not null references hands(id),
  player_id       text not null references players(id),
  hole_cards      jsonb not null default '[]',
  current_bet     integer not null default 0,
  total_bet       integer not null default 0,
  status          text not null default 'active',
  final_hand_rank text,
  unique(hand_id, player_id)
);

create table if not exists actions (
  id          text primary key,
  hand_id     text not null references hands(id),
  player_id   text not null references players(id),
  street      text not null,
  action      text not null,
  amount      integer not null default 0,
  acted_at    bigint not null
);

create index if not exists players_room_id_idx on players(room_id);
create index if not exists hands_room_id_idx on hands(room_id);
create index if not exists hand_players_hand_id_idx on hand_players(hand_id);
create index if not exists actions_hand_id_idx on actions(hand_id);
