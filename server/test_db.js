const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/sih-dropout')
  .then(async () => {
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ username: 'aditi.sharma@example.com' });
    console.log('User:', user);
    if (user) {
      const match = await bcrypt.compare('demo123', user.passwordHash);
      console.log('Match demo123:', match);
      const matchOld = await bcrypt.compare('password123', user.passwordHash);
      console.log('Match password123:', matchOld);
    }
    process.exit(0);
  })
  .catch(console.error);
