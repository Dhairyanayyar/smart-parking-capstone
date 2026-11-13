
import React, { useEffect, useState } from "react";
import { api } from "./api";

export default function ParkingBooking({ onBooked }) {
  const [spaces, setSpaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  function formatDate(value) {
    return String(value || "").slice(0, 10);
  }

  function formatTime(value) {
    return String(value || "").slice(0, 5);
  }

  function showError(text) {
    setMessage(text);
    setMessageType("error");
  }

  function showSuccess(text) {
    setMessage(text);
    setMessageType("success");
  }

  async function loadSpaces() {
    setLoadingSpaces(true);

    try {
      const data = await api("/parking-spaces");
      setSpaces(data.parkingSpaces || []);
    } catch (error) {
      showError(
        error.message || "Unable to load parking spaces."
      );
    } finally {
      setLoadingSpaces(false);
    }
  }

  useEffect(() => {
    loadSpaces();
  }, []);

  async function bookParking(event) {
    event.preventDefault();

    if (!selected || loading) {
      return;
    }

    if (!startTime || !endTime) {
      showError("Please select a start and end time.");
      return;
    }

    if (startTime >= endTime) {
      showError("End time must be after start time.");
      return;
    }

    const availableFrom = formatTime(selected.available_from);
    const availableUntil = formatTime(selected.available_until);

    if (
      startTime < availableFrom ||
      endTime > availableUntil
    ) {
      showError(
        "Please select a time within the parking space availability."
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      await api("/reservations", "POST", {
        parkingSpaceId: selected.id,
        reservationDate: formatDate(selected.available_date),
        startTime,
        endTime
      });

      showSuccess("Parking booked successfully!");

      setSelected(null);
      setStartTime("");
      setEndTime("");

      await loadSpaces();

      if (onBooked) {
        await onBooked();
      }
    } catch (error) {
      if (error.status === 409) {
        showError(
          "This parking space is already booked for the selected time. Please choose another time or parking space."
        );
      } else if (error.status === 401) {
        showError(
          "Your session has expired. Please sign in again."
        );
      } else {
        showError(
          error.message || "Unable to complete booking."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Find & Book Parking</h1>

      {message && (
        <p
          role={messageType === "error" ? "alert" : "status"}
          style={{
            color:
              messageType === "error"
                ? "#b91c1c"
                : "#15803d",
            backgroundColor:
              messageType === "error"
                ? "#fef2f2"
                : "#f0fdf4",
            padding: "12px",
            borderRadius: "8px",
            border: `1px solid ${
              messageType === "error"
                ? "#fecaca"
                : "#bbf7d0"
            }`
          }}
        >
          {message}
        </p>
      )}

      {loadingSpaces && (
        <p role="status">Loading parking spaces...</p>
      )}

      {!loadingSpaces && spaces.length === 0 && (
        <p>No available parking spaces found.</p>
      )}

      {!loadingSpaces &&
        spaces.map((space) => (
          <div
            className="reservation-card"
            key={space.id}
          >
            <h3>
              {space.location} - {space.space_number}
            </h3>

            <p>Address: {space.address}</p>

            <p>
              Price: ${space.price_per_hour}/hour
            </p>

            <p>
              Date: {formatDate(space.available_date)}
            </p>

            <p>
              Available: {formatTime(space.available_from)}
              {" - "}
              {formatTime(space.available_until)}
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setSelected(space);
                setStartTime(
                  formatTime(space.available_from)
                );
                setEndTime(
                  formatTime(space.available_until)
                );
                setMessage("");
                setMessageType("");
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
            <label htmlFor="bookingStart">
              Start Time
            </label>

            <input
              id="bookingStart"
              type="time"
              required
              value={startTime}
              min={formatTime(selected.available_from)}
              max={formatTime(selected.available_until)}
              disabled={loading}
              onChange={(event) =>
                setStartTime(event.target.value)
              }
            />
          </div>

          <div className="field">
            <label htmlFor="bookingEnd">
              End Time
            </label>

            <input
              id="bookingEnd"
              type="time"
              required
              value={endTime}
              min={formatTime(selected.available_from)}
              max={formatTime(selected.available_until)}
              disabled={loading}
              onChange={(event) =>
                setEndTime(event.target.value)
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Booking..."
              : "Confirm Booking"}
          </button>
        </form>
      )}
    </div>
  );
}
