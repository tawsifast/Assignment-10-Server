const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
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
    await client.connect();
    const db = client.db("assignment-10");
    const userCollection = db.collection("user");
    const propertyCollection = db.collection("properties");
    const favouriteCollection = db.collection("favourites");
    const bookingCollection = db.collection("bookings");
    const ownerBookingCollection = db.collection("ownerBookings");

    // ALL THE API IS HERE

    // OWNER PROPERTIES RELATED API
    app.get("/properties", async (req, res) => {
      const cursor = propertyCollection.find();
      const result = await cursor.toArray();
      res.json(result);
    });

    app.get("/properties/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await propertyCollection.findOne(query);
      res.json(result);
    });

    app.post("/properties", async (req, res) => {
      const property = req.body;
      const newProperty = {
        ...property,
        createdAt: new Date(),
      };
      const result = await propertyCollection.insertOne(newProperty);
      res.json(result);
    });

    app.get("/my/properties", async (req, res) => {
      let query = {};
      if (req.query.ownerId) {
        query.ownerId = req.query.ownerId;
      }
      const result = await propertyCollection.find(query).toArray();
      res.json(result || {});
    });

    app.patch("/my/properties/:propertyId", async (req, res) => {
      const { propertyId } = req.params;
      const newlyUpdatedData = req.body;
      const result = await propertyCollection.updateOne(
        { _id: new ObjectId(propertyId) },
        { $set: newlyUpdatedData },
      );
      console.log(newlyUpdatedData);
      res.json(result);
    });

    app.delete("/my/properties/:id", async (req, res) => {
      const { id } = req.params;
      const result = await propertyCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // FAVOURITE API
    app.post("/favourites", async (req, res) => {
      const favouriteData = req.body;
      const favorite = {
        ...favouriteData,
        createdAt: new Date(),
      };
      const result = await favouriteCollection.insertOne(favorite);
      res.json(result);
    });

    app.get("/favourites/:email", async (req, res) => {
      const result = await favouriteCollection
        .find({ userEmail: req.params.email })
        .toArray();
      res.json(result);
    });

    app.delete("/favourites/:id", async (req, res) => {
      const { id } = req.params;
      const result = await favouriteCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // BOKING RELATED API
    app.post("/bookings", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.send(result);
    });

    app.get("/bookings", async (req, res) => {
      let query = {};
      if (req.query.userEmail) {
        query.email = req.query.userEmail;
      }
      const result = await bookingCollection.find(query).toArray();
      res.json(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: "paid" } },
      );
      res.send(result);
    });

    app.patch("/owner/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const filter =  { _id: new ObjectId(id) }
      const newlyBookingData = {
            $set : {
               bookingStatus: updatedBooking.bookingStatus
            },
            }
      const result = await bookingCollection.updateOne(filter, newlyBookingData);
      console.log(result,"rslt");
      res.json(result);
      
    });

    // OWNER BOOKING
    app.get("/owner/bookings", async (req, res) => {
      let query = {};
      if (req.query.ownerEmail) {
        query.ownerEmail = req.query.ownerEmail;
      }
      const result = await bookingCollection.find(query).toArray();
      res.json(result);
    });

     app.get("/allBookings", async (req, res) => {
      const cursor = bookingCollection.find();
      const result = await cursor.toArray();
      console.log(result);
      res.json(result);
    });

    // USER RELATED API
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();

      console.log(result);

      res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!wow");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
