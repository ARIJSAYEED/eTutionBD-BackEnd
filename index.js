const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000

const { MongoClient, ServerApiVersion } = require('mongodb');

// middlewares 
app.use(express.json())
app.use(cors())

console.log(process.env.DB_USERNAME, process.env.DB_PASSWORD);

// Replace the placeholder with your Atlas connection string
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.taazt4c.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
async function runStableAPIConnect() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();

        const db = client.db("eTutionBD");
        const usersCollection = db.collection("usersCollection");

        // users-related api
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        const result = await client.db('admin').command({ ping: 1 });
        console.log(
            'Pinged your deployment. You successfully connected to MongoDB!'
        );
        return result;
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
runStableAPIConnect().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})