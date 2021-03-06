import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import listEndpoints from "express-list-endpoints";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/backend"
mongoose.connect(mongoUrl, {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.Promise = Promise

const port = process.env.PORT || 8080;
const app = express();

//// Middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

//// Mongoose connection
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({error: "The service is not available" })
  }
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
});

const User = mongoose.model("User", UserSchema)

//// Routes starting here 
app.get("/", (req, res) => {
  res.send(
    {
      "Hey!": "Welcome to the backend part of my Technigo final project! 🤖 💗",
      "You can find the available endpoints right here": "/endpoints",
      "Frontend this way -->": "Enter Netlify-link here later on"
    }
  )
});

app.get("/endpoints", (req, res) => {
  res.send(listEndpoints(app))
});

//// Endpoint to register a new user 
app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const salt = bcrypt.genSaltSync();
    if (password.length < 8) {
      res.status(400).json({
        response: "Your password must contain at least 8 characters",
        success: false
      });
    } else {
    const newUser = await new User({
      username: username,
      email: email,
      password: bcrypt.hashSync(password, salt)
    }).save();
    res.status(201).json({
      response: {
        username: newUser.username,
        email: email,
        accessToken: newUser.accessToken,
        userId: newUser._id
      },
      success: true
    })
  }
  } catch (error) {
    res.status(400).json({
      response: error,
      success: false
    });
  }
});

//// Endpoint to login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true, 
        username: user.username,
        email: user.email,
        accessToken: user.accessToken,
        userId: user._id 
      });
    } else {
      res.status(400).json({
        response: "Username and password do not match",
        success: false
      });
    }
  
  } catch (error) {
    res.status(400).json({
      response: error,
      success: false
    });
  }
});

const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization");
  try {
    const user = await User.findOne({ accessToken: accessToken});
    if (user) {
      next();
    } else {
      res.status(401).json({
        response: "Please log in",
        success: false
      });
    }
  } catch (error) {
    res.status(400).json({
      response: error,
      success: false
    });
  }
}

//// Two gets, first one to authenticate the user, then the user is able to get its journalentries (meaning logging in was successful)
app.get("/journalentries", authenticateUser);
app.get("/journalentries", (req, res) => {
  res.send("Here are your journal entries! 😍");
});

//// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
