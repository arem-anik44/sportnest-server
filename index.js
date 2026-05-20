const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const verifyCookie = (req, res, next) => {
  const token = req.cookies?.sportnest_token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

async function run() {
  try {
    const db = client.db("sportnest");
    const facilityCollection = db.collection("facilities");
    const bookingCollection = db.collection("bookings");

    console.log("Connected to MongoDB!");

    app.post("/auth/token", (req, res) => {
      const { email, name } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      const token = jwt.sign({ email, name }, process.env.JWT_SECRET, { expiresIn: "7d" });
      res.cookie("sportnest_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true });
    });

    app.post("/auth/logout", (req, res) => {
      res.clearCookie("sportnest_token");
      res.json({ success: true });
    });

    app.get("/facilities/featured", async (req, res) => {
      const result = await facilityCollection.find().limit(6).toArray();
      res.json(result);
    });

    app.get("/facilities/my", verifyToken, async (req, res) => {
      const result = await facilityCollection
        .find({ added_by: req.user.email })
        .toArray();
      res.json(result);
    });

    app.get("/facilities", async (req, res) => {
      const { search, types } = req.query;
      const query = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      if (types) {
        const typeArray = types.split(",").map((t) => t.trim());
        query.type = { $in: typeArray };
      }
      const result = await facilityCollection.find(query).toArray();
      res.json(result);
    });

    app.get("/facilities/:id", async (req, res) => {
      const { id } = req.params;
      const result = await facilityCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.post("/facilities", verifyToken, async (req, res) => {
      const facilityData = req.body;
      const result = await facilityCollection.insertOne(facilityData);
      res.json(result);
    });

    app.patch("/facilities/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await facilityCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.json(result);
    });

    app.delete("/facilities/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await facilityCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.get("/bookings", verifyToken, async (req, res) => {
      const { email } = req.query;
      const result = await bookingCollection.find({ user_email: email }).toArray();
      res.json(result);
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.json(result);
    });

    app.delete("/bookings/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("SportNest server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
