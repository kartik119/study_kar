const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Kanishk~1122@localhost:5432/study_karnataka?schema=public',
});

client.connect()
  .then(() => {
    console.log('PostgreSQL connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Current time in DB:', res.rows[0].now);
  })
  .catch(err => {
    console.error('Connection error', err.stack);
  })
  .finally(() => {
    client.end();
  });
