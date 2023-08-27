const express = require('express');
const mongoose = require('mongoose');
const uuid = require('uuid');
const app = express();
const port = 3000;

app.use(express.json());

mongoose.connect('mongodb://sahil12345:sahil54321@ac-7733dsa-shard-00-00.bc5lyvi.mongodb.net:27017,ac-7733dsa-shard-00-01.bc5lyvi.mongodb.net:27017,ac-7733dsa-shard-00-02.bc5lyvi.mongodb.net:27017/session_booking?ssl=true&replicaSet=atlas-a9042v-shard-0&authSource=admin&retryWrites=true&w=majority'
, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const studentSchema = new mongoose.Schema({
  university_id: String,
  password: String,
  token: String
});

const Student = mongoose.model('Student', studentSchema);

const deanSchema = new mongoose.Schema({
  university_id: String,
  password: String,
  token: String
});

const Dean = mongoose.model('Dean', deanSchema);

const sessionSchema = new mongoose.Schema({
  student_name: String,
  student_class: String,
  slot: String,
  status: { type: String, default: 'free' }
});

const Session = mongoose.model('Session', sessionSchema);

// Student Login API
app.post('/student/login', async (req, res) => {
  const { university_id, password } = req.body;
  const student = await Student.findOne({ university_id, password });
  if (student) {
    const token = uuid.v4();
    await Student.updateOne({ university_id }, { token });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// List Available Sessions API 
app.get('/student/sessions', async (req, res) => {

  const token = req.headers.authorization.split(' ')[1];
  const student = await Student.findOne({ token });
  if (!student) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const availableSessions = await Session.find({ status: 'free' });

    res.json(availableSessions);
  } catch (error) {

    res.status(500).json({ error: 'An error occurred while fetching available sessions.' });
  }
});

// API to book a session for a student
app.post('/student/book', async (req, res) => {
  try {
    const { session_slot, student_name, student_class } = req.body;

    const availableSession = await Session.findOne({
      slot: session_slot,
      status: 'free'
    });

    if (!availableSession) {
      return res.status(400).json({ error: 'Session is not available for booking.' });
    }

    availableSession.status = 'pending';
    availableSession.student_name = student_name;
    availableSession.student_class = student_class;
    await availableSession.save();

    res.json({ message: 'Session booked successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while booking the session.' });
  }
});

  

// Dean Login API
app.post('/dean/login', async (req, res) => {
  const { university_id, password } = req.body;
  const dean = await Dean.findOne({ university_id, password });
  if (dean) {
    const token = uuid.v4();
    await Dean.updateOne({ university_id }, { token });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// List Pending Sessions API (For Dean)
app.get('/dean/pending-sessions', async (req, res) => {

  const token = req.headers.authorization.split(' ')[1];
  const dean = await Dean.findOne({ token });
  if (!dean) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pendingSessions = await Session.find({ status: 'pending' }).populate('student_name', 'university_id');

  res.json(pendingSessions);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
