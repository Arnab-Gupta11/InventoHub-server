const express = require("express");
const cors = require("cors");
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

/*-------------------> parser <----------------------*/
app.use(cors());
app.use(express.json());

/*-------------------> Home API <----------------------*/
app.get("/", async (req, res) => {
  res.send("InventoHub server is running");
});
app.listen(port, () => {
  console.log(`Server is running at port : ${port}`);
});
