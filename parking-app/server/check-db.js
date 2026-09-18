const pool = require("./db");

async function checkDatabase() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, current_user AS username"
    );

    console.log("Database connection successful!");
    console.table(result.rows);
  } catch (error) {
    console.error("Database check failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkDatabase();