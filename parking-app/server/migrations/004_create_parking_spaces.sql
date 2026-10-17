
BEGIN;

CREATE TABLE parking_spaces (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    location VARCHAR(255) NOT NULL,

    space_number VARCHAR(50) NOT NULL,

    price_per_hour NUMERIC(10, 2) NOT NULL
        CHECK (price_per_hour >= 0),

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT parking_spaces_unique
        UNIQUE (location, space_number)
);

CREATE INDEX parking_spaces_location_idx
ON parking_spaces(location);

COMMIT;
