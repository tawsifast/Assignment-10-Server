const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet } = require("jose-cjs");
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

// const JWKS = createRemoteJWKSet(
//   new url(`${process.env.CLIENT_URL}/api/auth/jwks`),
// );

// const verifyToken = async (req, res, next) => {
//   const autheader = req.headers.authorization;

//   if (!autheader || autheader.startWith("Bearer")) {
//     return res.status(401).json({message: "Unauthorized"})
//   }
//   const token = autheader.split(" ")[1];
//   if(!token){
//     return res.status(401).json({message: "Unauthorized"})
//   }

//   try{
//     const {payload} = await jwtVerify(token, JWKS);
//     req.user = payload
//     console.log(payload,"payload");
//     next()
//   }catch(error){

//   }
// };

// const ownerVerify = async(req, res, next) =>{
//   const user = req.user;
//   if(user?.role !== "owner"){
//     return res.status(403).json({message: "Forbidden"})
//   }
//   next()
// }
// const tenantVerify = async(req, res, next) =>{
//   const user = req.user;
//   if(user?.role !== "tenant"){
//     return res.status(403).json({message: "Forbidden"})
//   }
//   next()
// }
// const adminVerify = async(req, res, next) =>{
//   const user = req.user;
//   if(user?.role !== "admin"){
//     return res.status(403).json({message: "Forbidden"})
//   }
//   next()
// }

const verifyToken = async (req, res, next) => {
  console.log("headers", req.headers);
  const autheader = req.headers.authorization;

  if (!autheader || !autheader.startWith("Bearer")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = autheader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};

async function run() {
  try {
    // await client.connect();
    const db = client.db("assignment-10");
    const userCollection = db.collection("user");
    const propertyCollection = db.collection("properties");
    const favouriteCollection = db.collection("favourites");
    const bookingCollection = db.collection("bookings");
    const ownerBookingCollection = db.collection("ownerBookings");
    const transactionCollection = db.collection("transactions");
    const sessionCollection = db.collection("session");
    const reviewCollection = db.collection("reviews");

    const verifyToken = async (req, res, next) => {
      console.log("headers", req.headers);
      const autheader = req.headers.authorization;

      if (!autheader || !autheader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Unauthorized: Missing or Invalid Token Format" });
      }

      const token = autheader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Unauthorized: Token missing" });
      }

      try {
        const query = { token: token };
        const session = await sessionCollection.findOne(query);
        if (!session) {
          return res.status(401).send({ message: "unauthorized access" });
        }

        const userId = session?.userId;

        const userQuery = { _id: userId };
        const user = await userCollection.findOne(userQuery);

        if (!user) {
          return res.status(401).send({ message: "unauthorized access" });
        }

        req.user = user;

        next();
      } catch (error) {
        console.error("Token verification error:", error);
        return res
          .status(500)
          .json({ message: "Internal Server Error during verification" });
      }
    };

    const verifyOwner = async (req, res, next) => {
      const user = req.user;
      if (user?.role !== "owner") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    };
    const verifyTenant = async (req, res, next) => {
      const user = req.user;
      if (user?.role !== "tenant") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    };
    const verifyAdmin = async (req, res, next) => {
      const user = req.user;
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    };
    // ALL THE API IS HERE

    // public api
    app.get("/properties", async (req, res) => {
      const { search, type, order, page } = req.query;

      const query = {};

      if (search) {
        query.location = { $regex: search, $options: "i" };
      }
      if (type && type !== "all") {
        query.propertyType = type;
      }

      let cursor = propertyCollection.find(query);

      if (order === "low-to-high") {
        cursor = cursor.sort({ price: 1 });
      } else if (order === "high-to-low") {
        cursor = cursor.sort({ price: -1 });
      }

      if (page) {
        const limit = 6;
        const skip = (parseInt(page) - 1) * limit;
        const total = await propertyCollection.countDocuments(query);
        const items = await cursor.skip(skip).limit(limit).toArray();
        return res.json({ total, items });
      }
      const result = await cursor.toArray();
      res.json(result);
    });

    // for features property in homepage
    app.get("/featuredProperty", async (req, res) => {
      const cursor = propertyCollection.find().limit(6);
      const result = await cursor.toArray();
      console.log(result);
      res.json(result);
    });

    // public property details
    app.get("/properties/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await propertyCollection.findOne(query);
      res.json(result);
    });

    // property post by owner
    app.post("/properties", verifyToken, verifyOwner, async (req, res) => {
      const property = req.body;
      const newProperty = {
        ...property,
        createdAt: new Date(),
      };
      const result = await propertyCollection.insertOne(newProperty);
      res.json(result);
    });

    // porperty api for specific owner
    app.get("/my/properties", verifyToken, verifyOwner, async (req, res) => {
      let query = {};
      if (req.query.ownerId) {
        query.ownerId = req.query.ownerId;
      }
      const result = await propertyCollection.find(query).toArray();
      res.json(result || {});
    });

    app.patch(
      "/my/properties/:propertyId",
      verifyToken,
      verifyOwner,
      async (req, res) => {
        const { propertyId } = req.params;
        const { _id, ...newlyUpdatedData } = req.body;
        const result = await propertyCollection.updateOne(
          { _id: new ObjectId(propertyId) },
          { $set: newlyUpdatedData },
        );
        res.json(result);
      },
    );

    // admin can approve and reject property
    app.patch(
      "/adminProperty/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const changedProperty = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatdProperty = {
          $set: {
            status: changedProperty.status,
            rejectionReason:
              changedProperty.status === "Rejected"
                ? changedProperty.rejectionReason || ""
                : null,
          },
        };
        const result = await propertyCollection.updateOne(
          filter,
          updatdProperty,
        );
        res.json(result);
      },
    );

    // owner can delete his property
    app.delete("/my/properties/:id", async (req, res) => {
      const { id } = req.params;
      const result = await propertyCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // for admin to show all property
    app.get("/allProperties", verifyToken, verifyAdmin, async (req, res) => {
      const cursor = propertyCollection.find();
      const result = await cursor.toArray();
      console.log(result);
      res.json(result);
    });
    app.delete("/allProperties/:selectedPropertyId", async (req, res) => {
      const { selectedPropertyId } = req.params;
      const result = await propertyCollection.deleteOne({
        _id: new ObjectId(selectedPropertyId),
      });
      res.json(result);
    });

    // FAVOURITE API
    // tenant can add favourite property
    app.post("/favourites", verifyToken, verifyTenant, async (req, res) => {
      const favouriteData = req.body;
      const favorite = {
        ...favouriteData,
        createdAt: new Date(),
      };
      const result = await favouriteCollection.insertOne(favorite);
      res.json(result);
    });

    // tenant can see their own favourite property
    app.get(
      "/favourites/:email",
      verifyToken,
      verifyTenant,
      async (req, res) => {
        const result = await favouriteCollection
          .find({ userEmail: req.params.email })
          .toArray();
        res.json(result);
      },
    );

    // tenant can delete their own favourite api
    app.delete("/favourites/:id", async (req, res) => {
      const { id } = req.params;
      const result = await favouriteCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // BOKING RELATED API
    // tenant can book property by stripe payment gateway
    app.post("/bookings", async (req, res) => {
      const bookingData = req.body;
      const existingBooking = await bookingCollection.findOne({
        propertyId: bookingData.propertyId.toString(),
        userEmail: bookingData.userEmail,
      });

      if (existingBooking) {
        return res.status(409).json({
          message: "Already booked",
        });
      }
      const result = await bookingCollection.insertOne(bookingData);
      res.send(result);
    });

    // tenant can see their booking property
    app.get("/bookings", async (req, res) => {
      let query = {};
      if (req.query.userEmail) {
        query.email = req.query.userEmail;
      }
      const result = await bookingCollection.find(query).toArray();
      res.json(result);
    });

    // after payment booking status changes
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: "paid" } },
      );
      res.send(result);
    });

    // tenant can see their booking property
    app.get(
      "/tenantBookings/:userEmail",
      verifyToken,
      verifyTenant,
      async (req, res) => {
        const userEmail = req.params.userEmail;
        const result = await bookingCollection
          .find({ userEmail: userEmail })
          .toArray();
        res.json(result);
      },
    );

    // owner can see people booking their property and owner can approve and reject them
    app.patch(
      "/owner/bookings/:id",
      verifyToken,
      verifyOwner,
      async (req, res) => {
        const id = req.params.id;
        const updatedBooking = req.body;
        const filter = { _id: new ObjectId(id) };
        const newlyBookingData = {
          $set: {
            bookingStatus: updatedBooking.bookingStatus,
          },
        };
        const result = await bookingCollection.updateOne(
          filter,
          newlyBookingData,
        );
        console.log(result, "result");
        res.json(result);
      },
    );

    // OWNER BOOKING
    app.get("/owner/bookings", verifyToken, verifyOwner, async (req, res) => {
      let query = {};
      if (req.query.ownerEmail) {
        query.ownerEmail = req.query.ownerEmail;
      }
      const result = await bookingCollection.find(query).toArray();
      res.json(result);
    });

    // admin can see the all the booking
    app.get("/allBookings", verifyToken, verifyAdmin, async (req, res) => {
      const cursor = bookingCollection.find();
      const result = await cursor.toArray();
      console.log(result);
      res.json(result);
    });

    // TRANSACTIONS API
    app.post("/transactions", async (req, res) => {
      const transaction = req.body;
      const result = await transactionCollection.insertOne(transaction);
      res.json(result);
    });

    app.get("/transactions", async (req, res) => {
      const transactions = await transactionCollection
        .find()
        .sort({ transactionDate: -1 })
        .toArray();
      res.json(transactions);
    });

    // REVIEW API
    app.post("/reviews", async (req, res) => {
      const reviewData = req.body;
      const review = {
        ...reviewData,
        createdAt: new Date(),
      };
      const result = await reviewCollection.insertOne(review);
      res.json(result);
    });

    // ১. একটি নির্দিষ্ট প্রোপার্টির রিভিউ পাওয়ার জন্য
    app.get("/reviews/:propertyId", async (req, res) => {
      const { propertyId } = req.params;
      const result = await reviewCollection
        .find({ propertyId: propertyId })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/home-reviews", async (req, res) => {
      const result = await reviewCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(4)
        .toArray();
      res.send(result);
    });

    // USER RELATED API
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();

      console.log(result);

      res.json(result);
    });

    // await client.db("admin").command({ ping: 1 });
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
