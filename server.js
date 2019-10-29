const express = require('express')
const app = express();
const rig = require('./random');

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect("mongodb+srv://quocviet:quocviet@vidly-2mbqg.mongodb.net/exercise-tracker?retryWrites=true&w=majority", { useNewUrlParser: true });
const User = mongoose.model('user', new mongoose.Schema({
  userId: {
    required: true,
    type: String
  },
  username: {
    required: true,
    type: String
  }
}));

const Exercise = mongoose.model('exercise', new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    require: true
  },
  duration: {
    type: Number,
    min: 0,
    required: true
  },
  date: {
    type: Date
  }
}));


app.use(cors())

app.use(express.urlencoded({ extended: false }));
app.use(express.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', async (req, res) => {
  let user = await User.findOne({ username: req.body.username });

  if (user) return res.send('Its been taken bitch...Be creative!');

  user = new User({
    username: req.body.username,
    userId: rig(6)      // Generate random 6-character string
  });

  await user.save();

  return res.json(user);
});

app.post('/api/exercise/add', async (req, res) => {
  const { userId, description, duration, date } = req.body;

  let user = await User.findOne({ userId });
  if (!user) return res.status(404).send("User not found");

  const username = user.username;

  let exercise = new Exercise({
    userId,
    description,
    duration,
    date: Date(date) || Date()
  });

  await exercise.save();

  return res.json({
    username,
    description,
    duration,
    date: String(exercise.date).split(' ').slice(0, 4).join(' '),
    userId
  });
});

app.get('/api/exercise/log', async (req, res) => {
  const { userId, from, to } = req.query;
  let limit = Number.parseInt(req.query.limit) || 0;


  if (!userId) return res.send("Please attach user id.");

  const user = await User.findOne({ userId });

  if (!user) return res.status(404).send('User not found.');
  const username = user.username;

  let log;
  let query;
  // Only userId provided
  if (!from && !to) {
    query = Exercise.find({ userId });
  }
  else if (from && to) {
    query = Exercise.find({ userId, date: { $gte: from, $lte: to } });
  }
  else if (!from && to) {
    query = Exercise.find({ userId, date: { $lte: to } });
  }
  else if (from && !to) {
    query = Exercise.find({ userId, date: { $gte: from } });
  }

  log = await query
    .select('description duration date -_id')
    .limit(limit)
    .exec();

  // if (!from && !to) {
  //   log = await Exercise.find({ userId })
  //     .select('description duration date -_id')
  //     .limit(limit);
  // }
  // else if (from && to) {
  //   log = await Exercise.find({ userId, date: { $gte: from, $lte: to } })
  //     .select('description duration date -_id')
  //     .limit(limit);
  // }
  // else if (!from && to) {
  //   log = await Exercise.find({ userId, date: { $lte: to } })
  //     .select('description duration date -_id')
  //     .limit(limit);
  // }
  // else if (from && !to) {
  //   log = await Exercise.find({ userId, date: { $gte: from } })
  //     .select('description duration date -_id')
  //     .limit(limit);
  // }

  return res.json({
    userId,
    username,
    count: log.length,
    log
  });
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
