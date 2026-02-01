const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function connectToDatabase() {
    try {
        await pool.query('select 1');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}
connectToDatabase();
module.exports = pool;//this is used to connect to the database by other files in the project by importing it like this: const pool = require('./db');