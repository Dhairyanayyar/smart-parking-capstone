BEGIN;

CREATE TABLE reservations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  user_id INTEGER NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  location VARCHAR(255) NOT NULL,

  reservation_date DATE NOT NULL,

  start_time TIME NOT NULL,

  end_time TIME NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX reservations_user_id_idx
ON reservations(user_id);

CREATE INDEX reservations_date_idx
ON reservations(reservation_date);

COMMIT;
