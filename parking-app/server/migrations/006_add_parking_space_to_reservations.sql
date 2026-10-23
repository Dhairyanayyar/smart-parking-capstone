
BEGIN;

-- Connect each reservation to a parking space.
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS parking_space_id INTEGER;

-- Add foreign key linking reservations to parking spaces.
ALTER TABLE reservations
ADD CONSTRAINT reservations_parking_space_fk
FOREIGN KEY (parking_space_id)
REFERENCES parking_spaces(id)
ON DELETE RESTRICT;

-- Improve booking availability searches.
CREATE INDEX IF NOT EXISTS reservations_space_date_idx
ON reservations(parking_space_id, reservation_date);

COMMIT;
