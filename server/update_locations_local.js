
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const updateLocations = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const counsellors = await User.find({ role: 'counsellor' });

    const locations = ["Gangapur Road", "CIDCO", "Nashik Road", "Panchavati", "College Road"];

    for (let i = 0; i < counsellors.length; i++) {
      const c = counsellors[i];
      const loc = locations[i % locations.length];
      await User.updateOne({ _id: c._id }, { $set: { location: loc } });
    }
    console.log('Updated locations to local Nashik areas!');
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
};

updateLocations();
