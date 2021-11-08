const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hrpwo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function run() {
    try {
        await client.connect();
        const database=client.db('doctors')
        const appointmentsCollections=database.collection('appointments')
        const usersCollections=database.collection('users')
    //  post user appointments
        app.post('/appointments',async(req,res)=>{
            const appointment = req.body;
            const result = await appointmentsCollections.insertOne(appointment);
            res.json(result)
        })
        // get all data through email 
        app.get('/appointments/email', async (req, res) => {
            const email = req.query.email;
            const date = new Date (req.query.date).toLocaleDateString() ;
            const query = { email: email, date: date }

            const cursor = appointmentsCollections.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })

        // post user 
        app.post('/users',async(req,res)=>{
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