
/**
 * Middleware that allows only logged-in administrators
 * to access protected routes.
 */
module.exports = (pool) => {
  return async (req, res, next) => {
    // Check whether the user is logged in.
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Please log in."
      });
    }

    try {
      // Retrieve the current user's role from PostgreSQL.
      const result = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [req.session.userId]
      );

      // Reject sessions for accounts that no longer exist.
      if (result.rows.length === 0) {
        return res.status(401).json({
          message: "Please log in."
        });
      }

      // Only administrators can continue.
      if (result.rows[0].role !== "admin") {
        return res.status(403).json({
          message: "Admin access required."
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
