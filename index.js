const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

/*-------------------> parser <----------------------*/
app.use(cors());
app.use(express.json());

/*-------------------> Connect Database <----------------------*/

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cliw5jo.mongodb.net/?retryWrites=true&w=majority`;

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
    const reviewsCollection = client.db("InventoHub").collection("reviews");
    const usersCollection = client.db("InventoHub").collection("users");
    const shopsCollection = client.db("InventoHub").collection("shops");

    /*-------------------> User api<----------------------*/
    app.get("/users/manager/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const user = await usersCollection.findOne(query);
      let manager = false;
      if (user) {
        manager = user?.role === "manager";
      }
      res.send({ manager });
    });
    app.get("/users/admin/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "user already exist in database", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/users/manager/:email", async (req, res) => {
      const userEmail = req.params.email;
      const updatedInfo = req.body;
      const filter = { email: userEmail };

      const updateDoc = {
        $set: { ...updatedInfo },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /*-------------------> Store api<----------------------*/
    app.get("/shops/:email", async (req, res) => {
      const userEmail = req.params.email;
      const filter = { owner_email: userEmail };
      const result = await shopsCollection.findOne(filter);
      res.send(result);
    });
    app.post("/shops", async (req, res) => {
      const newShop = req.body;
      newShop.productLimit = 3;
      const result = await shopsCollection.insertOne(newShop);
      res.send(result);
    });

    /*-------------------> review api<----------------------*/
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

/*-------------------> Home API <----------------------*/
app.get("/", async (req, res) => {
  res.send("InventoHub server is running");
});
app.listen(port, () => {
  console.log(`Server is running at port : ${port}`);
});
