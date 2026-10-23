
import React, { useEffect, useState } from "react";
import { api } from "./api";

export default function ParkingBooking({ onBooked }) {
  const [spaces, setSpaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function formatDate(value) {
    return String(value || "").slice(0, 10);
  }

  function formatTime(value) {
    return String(value || "").slice(0, 5);
  }

  async function loadSpaces() {
    try {
      const data = await api("/parking-spaces");
      setSpaces(data.parkingSpaces || []);
    } catch (error) {
      setMessage(error.message || "Unable to load parking spaces.");
    }
  }

  useEffect(() => {
    loadSpaces();
  }, []);

  async function bookParking(event) {
    event.preventDefault();

    if (!selected) return;

    if (startTime >= endTime) {
      setMessage("End time must be after start time.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api("/reservations", "POST", {
        parkingSpaceId: selected.id,
        reservationDate: formatDate(selected.available_date),
        startTime,
        endTime
      });

      setMessage("Parking booked successfully!");
      setSelected(null);

      if (onBooked) {
        await onBooked();
      }
    } catch (error) {
      setMessage(error.message || "Booking failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Find & Book Parking</h1>

      {message && <p role="status">{message}</p>}

      {spaces.length === 0 && (
        <p>No available parking spaces found.</p>
      )}

      {spaces.map((space) => (
        <div className="reservation-card" key={space.id}>
          <h3>
            {space.location} - {space.space_number}
          </h3>

          <p>Address: {space.address}</p>
          <p>Price: ${space.price_per_hour}/hour</p>
          <p>Date: {formatDate(space.available_date)}</p>
          <p>
            Available: {formatTime(space.available_from)}
            {" - "}
            {formatTime(space.available_until)}
          </p>

          <button
            type="button"
            onClick={() => {
              setSelected(space);
              setStartTime(formatTime(space.available_from));
              setEndTime(formatTime(space.available_until));
              setMessage("");
            }}
          >
            Book This Space
          </button>
        </div>
      ))}

      {selected && (
        <form onSubmit={bookParking}>
          <h2>Confirm Reservation</h2>

          <p>
            {selected.location} - {selected.space_number}
          </p>

          <div className="field">
            <label htmlFor="bookingStart">Start Time</label>
            <input
              id="bookingStart"
              type="time"
              required
              value={startTime}
              min={formatTime(selected.available_from)}
              max={formatTime(selected.available_until)}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="bookingEnd">End Time</label>
            <input
              id="bookingEnd"
              type="time"
              required
              value={endTime}
              min={formatTime(selected.available_from)}
              max={formatTime(selected.available_until)}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      )}
    </div>
  );
}
