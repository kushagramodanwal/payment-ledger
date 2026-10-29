const { Pool } = require("pg");
const { DATABASE_URL, PG_POOL_MAX, PG_SSL } = require("./env");

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: PG_POOL_MAX,
  ssl: PG_SSL ? true : undefined,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

async function connectDB() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("PostgreSQL connected");
  } finally {
    client.release();
  }
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("PostgreSQL rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, connectDB, withTransaction };
