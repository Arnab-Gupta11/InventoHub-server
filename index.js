const express = require("express");
require("dotenv").config();
const cors = require("cors");

const jwt = require("jsonwebtoken");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const productsCollection = client.db("InventoHub").collection("products");
    const cartsCollection = client.db("InventoHub").collection("carts");
    const salesCollection = client.db("InventoHub").collection("sales");
    const subscriptionCollection = client.db("InventoHub").collection("subscription");
    const totalSoldCollection = client.db("InventoHub").collection("totalSold");

    /*-------------------> jwt related api<----------------------*/
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "5h" });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // verify admin
    const verifyManager = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "manager";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    /*-------------------> User api<----------------------*/
    app.get("/users/manager/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const user = await usersCollection.findOne(query);
      let manager = false;
      if (user) {
        manager = user?.role === "manager";
      }
      res.send({ manager, user });
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
    app.get("/users/admin", async (req, res) => {
      try {
        // const userEmail = req.params.email;
        const query = { role: "admin" };
        const result = await usersCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    app.get("/users", async (req, res) => {
      try {
        const filter = { role: { $ne: "admin" } };
        const result = await usersCollection.find(filter).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
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
    app.patch("/users/admin", async (req, res) => {
      const filter = { role: "admin" };
      const updatedInfo = req.body;
      const updateDoc = {
        $set: { ...updatedInfo },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
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
    app.get("/shops", async (req, res) => {
      const result = await shopsCollection.find().toArray();
      res.send(result);
    });

    app.post("/shops", async (req, res) => {
      const newShop = req.body;
      newShop.productLimit = 3;
      const result = await shopsCollection.insertOne(newShop);
      res.send(result);
    });
    app.patch("/shops/:email", async (req, res) => {
      const userEmail = req.params.email;
      const updatedInfo = req.body;
      console.log(updatedInfo);
      const filter = {
        owner_email: userEmail,
      };

      const updateDoc = {
        $set: { ...updatedInfo },
      };
      const result = await shopsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /*-------------------> product api<----------------------*/

    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });
    app.get("/products/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { userEmail: email };
      const result = await productsCollection.find(filter).toArray();
      res.send(result);
    });
    app.get("/products/:email/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(filter);
      res.send(result);
    });
    app.get("/carts", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const newProducts = req.body;
      const result = await cartsCollection.insertOne(newProducts);
      res.send(result);
    });
    app.post("/products", async (req, res) => {
      const newProducts = req.body;
      const result = await productsCollection.insertOne(newProducts);
      res.send(result);
    });
    app.put("/products/:email/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const UpdatedProduct = req.body;
        const book = {
          $set: {
            ...UpdatedProduct,
          },
        };
        const result = await productsCollection.updateOne(filter, book, options);
        res.send(result);
      } catch (err) {
        console.log(err.message);
      }
    });
    app.patch("/products/:email/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateOperation = { $inc: { saleCount: 1, product_quantity: -1 } };

        const result = await productsCollection.updateOne(filter, updateOperation);
        res.send(result);
      } catch (err) {
        console.log(err.message);
      }
    });
    app.delete("/products/:email/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err.message);
      }
    });

    /*-------------------> Sales api<----------------------*/
    app.get("/sales", async (req, res) => {
      const result = await salesCollection.find().toArray();
      res.send(result);
    });
    app.get("/sales/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const result = await salesCollection.find(query).sort({ currentDate: -1 }).toArray();
      res.send(result);
    });

    app.post("/sales", async (req, res) => {
      const newSales = req.body;
      const result = await salesCollection.insertMany(newSales);
      res.send(result);
    });

    /*-------------------> total sold api<----------------------*/
    app.post("/totalSold", async (req, res) => {
      const sold = req.body;
      const result = await totalSoldCollection.insertOne(sold);
      res.send(result);
    });

    /*-------------------> getPaid api<----------------------*/

    app.post("/getPaid", async (req, res) => {
      try {
        const { cartProductsIds, cartId } = req.body;

        //convert to objectID
        const cartProductObjectIds = cartProductsIds.map((id) => new ObjectId(id));

        // //fetch matching cart data from product collection
        const cartProducts = await productsCollection.find({ _id: { $in: cartProductObjectIds } }).toArray();

        // //Find the quantity of similar  product in cart collection
        const cartProductQuantities = {};
        for (const productId of cartProductsIds) {
          const quantity = cartProductsIds.filter((id) => id === productId).length;
          cartProductQuantities[productId] = quantity;
        }

        // //update product count and salesCount  in product collection

        for (const product of cartProducts) {
          const quantityInCart = cartProductQuantities[product._id.toString()] || 0;
          // Increment salesCount and decrement quantity
          product.saleCount = (product.saleCount || 0) + quantityInCart;
          product.product_quantity = (product.product_quantity || 0) - quantityInCart;
          // Update the document in the products collection
          const filter = { _id: product._id };
          const updatedDoc = {
            $set: { saleCount: product.saleCount, product_quantity: product.product_quantity },
          };
          await productsCollection.updateOne(filter, updatedDoc);
        }

        const result = await cartsCollection.deleteMany({ _id: { $in: cartId.map((id) => new ObjectId(id)) } });

        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    /*-------------------> review api<----------------------*/
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });
    app.get("/subscription", async (req, res) => {
      try {
        const result = await subscriptionCollection.find().toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    app.get("/subscription/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await subscriptionCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //payment intent
    app.post("/api/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        console.log("amount in intent", amount);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({
          clientSecreat: paymentIntent.client_secret,
        });
      } catch (err) {
        console.log(err);
      }
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
