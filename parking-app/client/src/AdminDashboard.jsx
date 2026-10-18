
import { useEffect, useState } from "react";
import { api } from "./api";

const emptyForm = {
  location: "",
  spaceNumber: "",
  pricePerHour: "",
  isAvailable: true
};

// Admin dashboard for managing parking spaces.
export default function AdminDashboard() {
  const [spaces, setSpaces] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Retrieves parking spaces from the backend.
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

  // Loads spaces when the dashboard opens.
  useEffect(() => {
    loadSpaces();
  }, []);

  // Updates the form when an input changes.
  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  // Creates a new space or updates an existing one.
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      location: form.location.trim(),
      spaceNumber: form.spaceNumber.trim(),
      pricePerHour: Number(form.pricePerHour),
      isAvailable: form.isAvailable
    };

    if (
      !payload.location ||
      !payload.spaceNumber ||
      form.pricePerHour === "" ||
      !Number.isFinite(payload.pricePerHour) ||
      payload.pricePerHour < 0
    ) {
      setError("Please enter valid parking space details.");
      return;
    }

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
    }
  }

  // Fills the form with the selected parking space.
  function handleEdit(space) {
    setEditingId(space.id);
    setForm({
      location: space.location,
      spaceNumber: space.space_number,
      pricePerHour: String(space.price_per_hour),
      isAvailable: space.is_available
    });
    setMessage("");
    setError("");
  }

  // Deletes a parking space after confirmation.
  async function handleDelete(id) {
    if (!window.confirm("Delete this parking space?")) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await api(`/admin/parking-spaces/${id}`, "DELETE");

      setMessage("Parking space deleted successfully.");

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      await loadSpaces();
    } catch (err) {
      setError(err.message);
    }
  }

  // Cancels editing and resets the form.
  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
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

        <label htmlFor="parking-location">Location</label>
        <input
          id="parking-location"
          name="location"
          value={form.location}
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
          step="0.01"
          value={form.pricePerHour}
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

        <button type="submit">
          {editingId !== null ? "Update Space" : "Add Space"}
        </button>

        {editingId !== null && (
          <button type="button" onClick={cancelEdit}>
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
              <h4>{space.location} — {space.space_number}</h4>

              <p>Price: ${space.price_per_hour}/hour</p>

              <p>
                Status:{" "}
                {space.is_available
                  ? "Available"
                  : "Unavailable"}
              </p>

              <button
                type="button"
                onClick={() => handleEdit(space)}
              >
                Edit
              </button>

              <button
                type="button"
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
