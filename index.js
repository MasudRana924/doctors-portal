const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const fileUpload = require('express-fileupload');
const admin = require("firebase-admin");

const port = process.env.PORT || 5000;
// token
// const serviceAccount = require('./doctors-portal-firebase-adminsdk.json');
const serviceAccount =JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json())
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hrpwo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// token part 
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('doctors')
        const appointmentsCollections = database.collection('appointments')

        const usersCollections = database.collection('users')
        const doctorsCollections = database.collection('doctors');
        //  post user appointments
        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollections.insertOne(appointment);
            res.json(result)
        })
        // get all data through email 
        app.get('/appointments/email',verifyToken, async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date: date }

            const cursor = appointmentsCollections.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })
        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await appointmentsCollections.findOne(query);
            res.json(result);
        })

        // doctors 
        app.post('/doctors', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const pic = req.files.image;
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const doctor = {
                name,
                email,
                image: imageBuffer
            }
            const result = await doctorsCollections.insertOne(doctor);
            res.json(result);
        })
        app.get('/doctors', async (req, res) => {
            const cursor = doctorsCollections.find({});
            const doctors = await cursor.toArray();
            res.json(doctors);
        });
        app.get('/doctors/:id', async (req, res) => {
            const query = { _id: ObjectId(req.params.id) }
            const doctor = await doctorsCollection.findOne(query);
            res.json(doctor);
        });
        // post user 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollections.insertOne(user);
            res.json(result)
        })
        //    google signin or checked users
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollections.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        //    make admin 

        // app.put('/users/admin', async (req, res) => {
        //     const user = req.body;

        //     const filter = { email: user.email };
        //     const updateDoc = { $set: { role: 'admin' } };
        //     const result = await usersCollections.updateOne(filter, updateDoc);
        //     res.json(result);
        // })
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollections.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollections.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })
        // checked admin or not 
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollections.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

    }
    finally {
        // await client.close();
    }
}


run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Doctors portal!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})