const express = require('express')
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = 3000
const stripe = require('stripe')(process.env.STRIPE_SECRET);


// firbase-adminSDK
const admin = require("firebase-admin");
// const serviceAccount = require("./etuitionbd-firebase-adminsdk.json");
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
        return res.status(401).send({ message: 'unauthorize access' })
    }
    try {
        const idToken = token.split(' ')[1]
        const decoded = await admin.auth().verifyIdToken(idToken)
        // console.log("decoded", decoded);
        req.decoded_email = decoded.email
        next();
    }
    catch (err) {
        return res.status(401).send({ message: 'unauthorize access' })
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
        const db = client.db("etuitionBD");
        const userCollection = db.collection("users")
        const tuitionCollection = db.collection("tuitions")
        const tuitionApplicationsCollection = db.collection("tuitionApplications")
        const paymentCollection = db.collection('payments')

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

        app.get('/users/:email/role', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            res.send({ role: user?.role || 'student' });
        })


        // tuitions related apis 
        app.post('/tuitions', async (req, res) => {
            const tuition = req.body;
            tuition.adminApproval = "pending";
            tuition.tuitionStatus = "pending";
            tuition.createdAt = new Date();
            const result = await tuitionCollection.insertOne(tuition);
            res.send(result)
        })

        app.get('/tuitions', async (req, res) => {

            const email = req.query.email;
            const adminApproval = req.query.adminApproval;
            // console.log(email)
            const query = {};

            if (email) {
                query.studentEmail = email
                // if (email !== req.decoded_email) {
                //     return res.status(403).send({ message: 'forbidden access' })
                // }
            }
            if (adminApproval) {
                query.adminApproval = adminApproval
            }
            const cursor = tuitionCollection.find(query).sort({ createdAt: -1 });
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/tuitions/:tuitionId', async (req, res) => {

            const tuitionId = req.params.tuitionId;

            // console.log(tuitionId)
            const query = { _id: new ObjectId(tuitionId) }

            const result = await tuitionCollection.findOne(query)

            res.send(result)
        })

        app.delete('/tuitions/:tuitionId', async (req, res) => {

            const tuitionId = req.params.tuitionId;

            // console.log(tuitionId)

            const query = { _id: new ObjectId(tuitionId) }

            const result = await tuitionCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/tuitions/:tuitionId', async (req, res) => {

            const tuitionId = req.params.tuitionId

            const { adminApproval } = req.body

            const query = { _id: new ObjectId(tuitionId) }

            const updateInfo = {
                $set: { adminApproval }
            }

            // console.log(query,updateInfo)

            const result = await tuitionCollection.updateOne(query, updateInfo)
            res.send(result)
        })

        // tutor related apis
        app.get('/applied-tuitions', async (req, res) => {
            const email = req.query.email;
            // console.log(email)
            const query = {}
            if (email) {
                query.tutorEmail = email
            }
            const cursor = tuitionApplicationsCollection.find(query)
            const result = await cursor.toArray();
            res.send(result)
        })

        // tuition-applications related api
        app.post('/tuitionApplications', async (req, res) => {

            const tuitionApplication = req.body;

            tuitionApplication.appliedAt = new Date();
            // tuitionApplication.tuitionStatus = "pending"

            // console.log(tuitionApplication)

            const result = await tuitionApplicationsCollection.insertOne(tuitionApplication)

            res.send(result)
        })

        // GET applications for a specific tuition
        app.get('/tuitionApplications', async (req, res) => {

            const tuitionId = req.query.tuitionId;
            const studentEmail = req.query.studentEmail;
            // console.log(studentEmail)

            const query = {}

            if (tuitionId) {
                query.tuitionId = tuitionId;
            }

            if (studentEmail) {
                query.studentEmail = studentEmail
            }

            const cursor = tuitionApplicationsCollection.find(query).sort({ createdAt: -1 });

            const result = await cursor.toArray();

            res.send(result);
        });

        // payment related apis
        app.post('/create-checkout-session', async (req, res) => {
            const paymentInfo = req.body;
            const amount = parseInt(paymentInfo.expectedSalary) * 100

            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: "USD",
                            product_data: {
                                name: paymentInfo.classGrade
                            },
                            unit_amount: amount,
                        },
                        quantity: 1,
                    },
                ],
                customer_email: paymentInfo.studentEmail,
                mode: 'payment',
                metadata: {
                    tuitionId: paymentInfo.tuitionId
                },
                success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
            })
            console.log(session)
            res.send({ url: session.url })
        })

        app.patch('/payment-success', async (req, res) => {
            const sessionId = req.query.session_id
            const session = await stripe.checkout.sessions.retrieve(sessionId)
            // console.log("session is-", session)
            // console.log("metadata:", session.metadata)

            const transactionId = session.payment_intent;
            const query = { transactionId: transactionId }
            const paymentExist = await paymentCollection.findOne(query)
            if (paymentExist) {
                return res.send({ message: 'already exists', transactionId })
            }

            if (session.payment_status === "paid") {
                const id = session.metadata.tuitionId;
                const query = { _id: new ObjectId(id) }
                const update = {
                    $set: {
                        paymentStatus: 'paid',
                        tuitionStatus: "tutorBooked"
                    }
                }
                const result = await tuitionCollection.updateOne(query, update);

                const payment = {
                    amount: session.amount_total / 100,
                    currency: session.currency,
                    customerEmail: session.customer_email,
                    tuitionId: session.metadata.tuitionId,
                    transactionId: session.payment_intent,
                    paymentStatus: session.payment_status,
                    paidAt: new Date(),
                }

                if (session.payment_status === "paid") {
                    const resultPayment = await paymentCollection.insertOne(payment)
                    res.send({
                        success: true,
                        modifyParcel: result,
                        transactionId: session.payment_intent,
                        paymentInfo: resultPayment
                    })
                }

            }
            res.send({ success: false })
        })

        app.get('/payments', async (req, res) => {
            const email = req.query.email;
            // console.log(email)
            const query = {}
            if (email) {
                query.customerEmail = email
            }
            const cursor = paymentCollection.find(query).sort({ paidAt: -1 });

            const result = await cursor.toArray();
            res.send(result)
        })


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
