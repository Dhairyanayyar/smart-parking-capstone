
BEGIN;

-- Add parking address and availability details.
ALTER TABLE parking_spaces
ADD COLUMN address VARCHAR(255),
ADD COLUMN available_date DATE,
ADD COLUMN available_from TIME,
ADD COLUMN available_until TIME;

-- Ensure the availability end time is later than start time.
ALTER TABLE parking_spaces
ADD CONSTRAINT parking_valid_time
CHECK (
  available_from IS NULL
  OR available_until IS NULL
  OR available_until > available_from
);

COMMIT;
