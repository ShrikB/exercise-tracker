const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// MongoDB setup
const mongoose = require('mongoose');
const { Schema } = mongoose;

const uri = "mongodb+srv://testuser:pp123@bech4.zjecm.mongodb.net/?retryWrites=true&w=majority&appName=BECH4";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const activitySchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  description: [String],
  duration: [Number],
  date: [Date],
});

const ActivityDB = mongoose.model("ExData", activitySchema);

async function newUser(userName) {
  const user = new ActivityDB({ username: userName });
  return await user.save();
}

async function getData(type, value) {
  switch (type) {
    case "user":
      return await ActivityDB.findOne({ username: value });
    case "id":
      return await ActivityDB.findById(value);
    default:
      throw new Error("Invalid type for getData");
  }
}

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: "Invalid username" });
  }
  try {
    const savedUser = await newUser(username.trim());
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await ActivityDB.find({}, '_id username');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || isNaN(duration)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const user = await getData("id", userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const exerciseDate = date ? new Date(date) : new Date();
    user.description.push(description);
    user.duration.push(Number(duration));
    user.date.push(exerciseDate);
    user.count = user.description.length;

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exerciseDate.toDateString(),
      duration: Number(duration),
      description,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await getData("id", userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let logs = user.description.map((desc, index) => ({
      description: desc,
      duration: user.duration[index],
      date: user.date[index].toDateString(),
    }));

    if (from) logs = logs.filter(log => new Date(log.date) >= new Date(from));
    if (to) logs = logs.filter(log => new Date(log.date) <= new Date(to));
    if (limit) logs = logs.slice(0, Number(limit));

    res.json({
      _id: user._id,
      username: user.username,
      count: logs.length,
      log: logs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
