const express = require('express')
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = 3000

// firbase-adminSDK
const admin = require("firebase-admin");

// const serviceAccount = require("./etutionbd-firebase-adminsdk.json");

// const serviceAccount = require("./firebase-admin-key.json");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middlewares
app.use(express.json());
app.use(cors())

// custom middlewares
const verifyFBtoken = async (req, res, next) => {

    const token = req.headers.authorization;
    // console.log(token)

    if (!token) {
        return res.status(401).send({ message: 'kire manger nati, ki korte chas' })
    }
    try {
        const idToken = token.split(' ')[1]
        const decoded = await admin.auth().verifyIdToken(idToken)
        // console.log("decoded", decoded);
        req.decoded_email = decoded.email
        next();
    }
    catch (err) {
        return res.status(401).send({ message: 'token not found for this user' })
    }
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})
// mongodb connection

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-hcxuuhk-shard-00-00.taazt4c.mongodb.net:27017,ac-hcxuuhk-shard-00-01.taazt4c.mongodb.net:27017,ac-hcxuuhk-shard-00-02.taazt4c.mongodb.net:27017/?ssl=true&replicaSet=atlas-qgx1um-shard-0&authSource=admin&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const db = client.db("eTutionBD");
        const userCollection = db.collection("users")
        const tutionCollection = db.collection("tutions")
        const tutionApplicationsCollection = db.collection("tutionApplications")

        // user related apis 
        app.post('/users', async (req, res) => {
            const user = req.body;
            if (!user.role) {
                user.role = "student"
            }
            user.createdAt = new Date();
            // console.log(user)
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const role = req.query.role;
            const email = req.query.email;
            // console.log(role)
            const query = {}

            if (email) {
                const result = await userCollection.findOne({ email });
                return res.send(result);
            }

            if (role) {
                query.role = role
            }
            const cursor = userCollection.find(query).sort({ createdAt: -1 })
            const result = await cursor.toArray();
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })


        // tutions related apis 
        app.post('/tutions', async (req, res) => {
            const tution = req.body;
            tution.adminApproval = "pending";
            tution.tutionStatus = "pending";
            tution.createdAt = new Date();
            const result = await tutionCollection.insertOne(tution);
            res.send(result)
        })

        app.get('/tutions', async (req, res) => {

            const email = req.query.email;
            const adminApproval = req.query.adminApproval;
            // console.log(email)
            const query = {};

            if (email) {
                query.studentEmail = email
                if (email !== req.decoded_email) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
            }
            if (adminApproval) {
                query.adminApproval = adminApproval
            }
            const cursor = tutionCollection.find(query).sort({ createdAt: -1 });
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/tutions/:tutionId', async (req, res) => {

            const tutionId = req.params.tutionId;

            // console.log(tutionId)
            const query = { _id: new ObjectId(tutionId) }

            const result = await tutionCollection.findOne(query)

            res.send(result)
        })

        app.delete('/tutions/:tutionId', async (req, res) => {

            const tutionId = req.params.tutionId;

            // console.log(tutionId)

            const query = { _id: new ObjectId(tutionId) }

            const result = await tutionCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/tutions/:tutionId', async (req, res) => {

            const tutionId = req.params.tutionId

            const { adminApproval } = req.body

            const query = { _id: new ObjectId(tutionId) }

            const updateInfo = {
                $set: { adminApproval }
            }

            // console.log(query,updateInfo)

            const result = await tutionCollection.updateOne(query, updateInfo)
            res.send(result)
        })

        // tutor related apis

        // tution-applications related api
        app.post('/tutionApplications', async (req, res) => {

            const tutionApplication = req.body;

            tutionApplication.appliedAt = new Date();
            // tutionApplication.tutionStatus = "pending"

            // console.log(tutionApplication)

            const result = await tutionApplicationsCollection.insertOne(tutionApplication)

            res.send(result)
        })

        // GET applications for a specific tuition
        app.get('/tutionApplications', async (req, res) => {

            const tutionId = req.query.tutionId;
            const studentEmail = req.query.studentEmail;
            // console.log(studentEmail)

            const query = {}

            if (tutionId) {
                query.tutionId = tutionId;
            }

            if (studentEmail) {
                query.studentEmail = studentEmail
            }

            const cursor = tutionApplicationsCollection.find(query).sort({ createdAt: -1 });

            const result = await cursor.toArray();

            res.send(result);
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
