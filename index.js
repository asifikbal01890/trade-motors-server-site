const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vh3xqbm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try {
        const categoryCollection = client.db('tradeMotors').collection('categories');
        const blogCollection = client.db('tradeMotors').collection('blog');
        const bikeCollection = client.db('tradeMotors').collection('bikes');
        const userCollection = client.db('tradeMotors').collection('users');
        const adsCollection = client.db('tradeMotors').collection('ads');
        const bookingCollection = client.db('tradeMotors').collection('booking');
        const paymentCollection = client.db('tradeMotors').collection('payment');

        app.get('/categories', async (req, res) => {
            const query = {};
            const categoryList = await categoryCollection.find(query).toArray();
            res.send(categoryList);
        })

        app.get('/categories/:id', async (req, res) => {
            id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const categoryBikes = await categoryCollection.findOne(query);
            res.send(categoryBikes);
        })

        app.get('/bikes', async (req, res) => {
            const id = req.query.id;
            const query = { id: id };
            const bikesList = await bikeCollection.find(query).toArray();
            res.send(bikesList);
        })

        app.post('/bikes', async (req, res) => {
            const bike = req.body;
            const result = await bikeCollection.insertOne(bike);
            res.send(result);
        })

        // app.patch('/bikes/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) }
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             ads: true
        //         }
        //     }
        //     const result = await bikeCollection.updateOne(filter, updatedDoc, options);
        //     res.send(result);
        // });

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        });

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        app.post("/create-payment-intent", async (req, res) => {
            const book = req.body;
            const price = book.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
              currency: "usd",
              amount: amount,
              "payment_method_types": [
                "card"
              ]
            });
          
            res.send({
              clientSecret: paymentIntent.client_secret,
            });
          });

        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = {_id: new ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.get('/blogs', async (req, res) => {
            const query = {};
            const blogsList = await blogCollection.find(query).toArray();
            res.send(blogsList);
        })

        app.get('/blogsLimit', async (req, res) => {
            const cursor = blogCollection.find({});
            const blogsList = await cursor.limit(2).toArray();
            res.send(blogsList);
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: 'you are not authorized' })
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users/seller', async (req, res) => {
            const role = req.role !== true;
            const query = { role };
            const sellers = await userCollection.find(query).toArray();
            res.send(sellers);
        })

        app.put('/users/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verify: 'verified'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const user = await userCollection.deleteOne(filter);
            res.send(user);
        })

        app.get('/users/buyer', async (req, res) => {
            const role = req.role === true;
            const query = { role };
            const buyers = await userCollection.find(query).toArray();
            res.send(buyers);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isSeller: user?.role === true });
        })

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isBuyer: user?.role === false });
        })

        app.get('/ads', async (req, res) => {
            const query = {};
            const adsInfo = await adsCollection.find(query).toArray();
            res.send(adsInfo);
        })
        app.post('/ads', async (req, res) => {
            const booking = req.body;
            const result = await adsCollection.insertOne(booking);
            res.send(result);
        })

    } 
    finally {
        
    }
}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('server is running');
})

app.listen(port, () => console.log(`server running on ${port}`));