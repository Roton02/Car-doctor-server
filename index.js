const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://car-doctors-59383.web.app",
      "https://car-doctors-59383.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("hello Roton");
});

// MiddleWare
const logger = (req, res, next) => {
  console.log(req.hostname);
  next();
};
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "Authorization access not allow" });
  }
  jwt.verify(token, process.env.SECRETE_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mi2xoxt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    console.log(process.env);
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    //json web token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRETE_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    app.post("/loggout", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ logoutSuccess: true });
    });
    // sevice related
    const DBCollection = client.db("cardoctor").collection("serviceCollection");
    const Bookings = client.db("cardoctor").collection("bookings");
    app.get("/services", async (req, res) => {
      const cursor = DBCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const cursor = await DBCollection.findOne(query, options);
      res.send(cursor);
    });
    app.post("/bookings", async (req, res) => {
      const doc = req.body;
      const result = await Bookings.insertOne(doc);
      res.send(result);
    });
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      // console.log(req.query?.email);
      // console.log(req.user);
      if (req.query?.email !== req.user.email) {
        return res.status(403).send({ message: "Forbidden" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      // console.log(query);
      const cursor = await Bookings.find(query).toArray();
      res.send(cursor);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await Bookings.deleteOne(query);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;
      const updateDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await Bookings.updateOne(query, updateDoc);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
