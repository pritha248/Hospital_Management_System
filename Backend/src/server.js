require("dotenv").config();

const app = require("./app");
const db = require("./config/database");
const initDb = require("./config/initDb");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await db.query("SELECT 1");
    console.log("✅ Database Connected");

    await initDb();

    app.listen(PORT,"0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {

    console.error("❌ Database Connection Failed");
    console.error(error.message);

  }
}

startServer();
