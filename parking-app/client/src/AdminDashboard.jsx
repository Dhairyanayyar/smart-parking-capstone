
import { useEffect, useState } from "react";
import { api } from "./api";

const emptyForm = {
  location: "",
  address: "",
  spaceNumber: "",
  pricePerHour: "",
  availableDate: "",
  availableFrom: "",
  availableUntil: "",
  isAvailable: true
};

/**
 * Administrator dashboard for managing parking spaces.
 */
export default function AdminDashboard() {
  const [spaces, setSpaces] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Retrieves all parking spaces from the backend.
  async function loadSpaces() {
    try {
      setError("");
      const data = await api("/admin/parking-spaces");
      setSpaces(data.parkingSpaces);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Loads the parking spaces when the dashboard opens.
  useEffect(() => {
    loadSpaces();
  }, []);

  // Updates the form when the administrator changes an input.
  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  // Adds a new parking space or updates an existing one.
  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    setError("");
    setMessage("");

    const payload = {
      location: form.location.trim(),
      address: form.address.trim(),
      spaceNumber: form.spaceNumber.trim(),
      pricePerHour: Number(form.pricePerHour),
      availableDate: form.availableDate,
      availableFrom: form.availableFrom,
      availableUntil: form.availableUntil,
      isAvailable: form.isAvailable
    };

    if (
      !payload.location ||
      !payload.address ||
      !payload.spaceNumber ||
      form.pricePerHour === "" ||
      !Number.isFinite(payload.pricePerHour) ||
      payload.pricePerHour < 0 ||
      !payload.availableDate ||
      !payload.availableFrom ||
      !payload.availableUntil ||
      payload.availableUntil <= payload.availableFrom
    ) {
      setError("Please enter valid parking space details.");
      return;
    }

    setBusy(true);

    try {
      if (editingId !== null) {
        await api(
          `/admin/parking-spaces/${editingId}`,
          "PUT",
          payload
        );

        setMessage("Parking space updated successfully.");
      } else {
        await api("/admin/parking-spaces", "POST", payload);

        setMessage("Parking space added successfully.");
      }

      setEditingId(null);
      setForm(emptyForm);
      await loadSpaces();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Loads a selected parking space into the editing form.
  function handleEdit(space) {
    setEditingId(space.id);

    setForm({
      location: space.location || "",
      address: space.address || "",
      spaceNumber: space.space_number || "",
      pricePerHour: String(space.price_per_hour),
      availableDate: space.available_date
        ? space.available_date.slice(0, 10)
        : "",
      availableFrom: space.available_from
        ? space.available_from.slice(0, 5)
        : "",
      availableUntil: space.available_until
        ? space.available_until.slice(0, 5)
        : "",
      isAvailable: space.is_available
    });

    setMessage("");
    setError("");
  }

  // Deletes a parking space after the administrator confirms.
  async function handleDelete(id) {
    if (busy || !window.confirm("Delete this parking space?")) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await api(`/admin/parking-spaces/${id}`, "DELETE");

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      await loadSpaces();
      setMessage("Parking space deleted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Cancels the editing operation.
  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  return (
    <section className="admin-dashboard">
      <h2>Admin Parking Management</h2>

      <p>Add, edit, and manage parking spaces.</p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <form onSubmit={handleSubmit}>
        <h3>
          {editingId !== null
            ? "Edit Parking Space"
            : "Add Parking Space"}
        </h3>

        <label htmlFor="parking-location">Location Name</label>
        <input
          id="parking-location"
          name="location"
          value={form.location}
          onChange={handleChange}
          maxLength={255}
          required
        />

        <label htmlFor="parking-address">Parking Address</label>
        <input
          id="parking-address"
          name="address"
          value={form.address}
          onChange={handleChange}
          maxLength={255}
          required
        />

        <label htmlFor="space-number">Space Number</label>
        <input
          id="space-number"
          name="spaceNumber"
          value={form.spaceNumber}
          onChange={handleChange}
          maxLength={50}
          required
        />

        <label htmlFor="hourly-price">Price Per Hour ($)</label>
        <input
          id="hourly-price"
          name="pricePerHour"
          type="number"
          min="0"
          max="99999999.99"
          step="0.01"
          value={form.pricePerHour}
          onChange={handleChange}
          required
        />

        <label htmlFor="available-date">Available Date</label>
        <input
          id="available-date"
          name="availableDate"
          type="date"
          value={form.availableDate}
          onChange={handleChange}
          required
        />

        <label htmlFor="available-from">Available From</label>
        <input
          id="available-from"
          name="availableFrom"
          type="time"
          value={form.availableFrom}
          onChange={handleChange}
          required
        />

        <label htmlFor="available-until">Available Until</label>
        <input
          id="available-until"
          name="availableUntil"
          type="time"
          value={form.availableUntil}
          onChange={handleChange}
          required
        />

        {editingId !== null && (
          <label>
            <input
              name="isAvailable"
              type="checkbox"
              checked={form.isAvailable}
              onChange={handleChange}
            />
            Available
          </label>
        )}

        <button type="submit" disabled={busy}>
          {busy
            ? "Saving..."
            : editingId !== null
              ? "Update Space"
              : "Add Space"}
        </button>

        {editingId !== null && (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </form>

      <h3>Parking Spaces</h3>

      {loading ? (
        <p>Loading parking spaces...</p>
      ) : spaces.length === 0 ? (
        <p>No parking spaces found.</p>
      ) : (
        <div className="parking-space-list">
          {spaces.map((space) => (
            <article key={space.id} className="parking-space-card">
              <h4>
                {space.location} — {space.space_number}
              </h4>

              <p>
                <strong>Address:</strong> {space.address || "Not set"}
              </p>

              <p>
                <strong>Price:</strong> ${space.price_per_hour}/hour
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {space.available_date
                  ? space.available_date.slice(0, 10)
                  : "Not set"}
              </p>

              <p>
                <strong>Time:</strong>{" "}
                {space.available_from
                  ? space.available_from.slice(0, 5)
                  : "Not set"}
                {" - "}
                {space.available_until
                  ? space.available_until.slice(0, 5)
                  : "Not set"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {space.is_available
                  ? "Available"
                  : "Unavailable"}
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleEdit(space)}
              >
                Edit
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleDelete(space.id)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
