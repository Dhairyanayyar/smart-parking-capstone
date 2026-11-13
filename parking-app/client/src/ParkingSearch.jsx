
import { useState } from "react";
import "./ParkingSearch.css";

export default function ParkingSearch() {
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSearched(false);
    setSpaces([]);

    try {
      const params = new URLSearchParams();

      if (location.trim()) {
        params.set("location", location.trim());
      }

      if (date) {
        params.set("date", date);
      }

      const response = await fetch(
        `/api/parking-spaces/search?${params.toString()}`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.error ||
          data.message ||
          "Unable to search parking spaces"
        );
      }

      const data = await response.json();

      setSpaces(data.parkingSpaces || []);
      setSearched(true);
    } catch (err) {
      setError(
        err.message || "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setLocation("");
    setDate("");
    setSpaces([]);
    setSearched(false);
    setError("");
  }

  function displayDate(value) {
    if (!value) {
      return "Not specified";
    }

    return String(value).slice(0, 10);
  }

  return (
    <section className="parking-search">
      <h2>Search Available Parking</h2>

      <form onSubmit={handleSearch}>
        <div className="search-fields">
          <label>
            Location
            <input
              type="text"
              placeholder="Enter city or location"
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
              }
            />
          </label>

          <label>
            Available Date
            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
            />
          </label>
        </div>

        <div className="search-actions">
          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Searching..."
              : "Search Parking"}
          </button>

          <button
            type="button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="search-error"
        >
          {error}
        </p>
      )}

      {searched && (
        <p role="status">
          {spaces.length} parking space(s) found.
        </p>
      )}

      {searched && spaces.length === 0 && (
        <p>No matching parking spaces found.</p>
      )}

      <div className="parking-results">
        {spaces.map((space) => (
          <article
            className="parking-card"
            key={space.id}
          >
            <h3>{space.location}</h3>

            <p>
              <strong>Address:</strong>{" "}
              {space.address || "Not available"}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {displayDate(space.available_date)}
            </p>

            <p>
              <strong>Hours:</strong>{" "}
              {space.available_from || "N/A"}
              {" - "}
              {space.available_until || "N/A"}
            </p>

            <span className="available-label">
              Available
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
