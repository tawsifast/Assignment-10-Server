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

    // ALL THE API IS HERE

    // PROPERTIES RELATED API
    app.get("/properties", async (req, res) => {
      const cursor = propertyCollection.find();
      const result = await cursor.toArray();
      res.json(result);
    });

    app.get("/properties/:id", async (req, res) => {
      const {id} = req.params;
      const query = {_id: new ObjectId(id)}
      const result = await propertyCollection.findOne(query);
      res.json(result);
    });

    app.post("/properties", async(req, res)=>{
        const property = req.body;
        const newProperty = {
            ...property,
            createdAt: new Date()
        }
        const result = await propertyCollection.insertOne(newProperty);
        res.json(result)
    })

    app.get("/my/properties", async(req, res)=>{
        let query = {};
        if(req.query.ownerId){
            query.ownerId = req.query.ownerId
        }
        const result = await propertyCollection.find(query).toArray();
        res.json(result || {});
    });

    app.get("/my/properties/:id", async(req, res)=>{
        const {id} = req.params;
        const newlyUpdatedData = req.body;
        const filter = {_id: new ObjectId(id)}
        const updatedResult = await propertyCollection.updateOne(
        {_id: new ObjectId(id)},
        {$set: newlyUpdatedData}
    );
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
