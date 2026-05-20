const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("sportnest");
    const facilityCollection = db.collection("facilities");
    const bookingCollection = db.collection("bookings");

    console.log("Connected to MongoDB!");

    app.get("/facilities/featured", async (req, res) => {
      const result = await facilityCollection.find().limit(6).toArray();
      res.json(result);
    });

    app.get("/facilities", async (req, res) => {
      const result = await facilityCollection.find().toArray();
      res.json(result);
    });

    app.get("/facilities/:id", async (req, res) => {
      const { id } = req.params;
      const result = await facilityCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.post("/facilities", async (req, res) => {
      const facilityData = req.body;
      console.log(facilityData);
      const result = await facilityCollection.insertOne(facilityData);
      res.json(result);
    });

    app.patch("/facilities/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await facilityCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.json(result);
    });

    app.delete("/facilities/:id", async (req, res) => {
      const { id } = req.params;
      const result = await facilityCollection.deleteOne({
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
