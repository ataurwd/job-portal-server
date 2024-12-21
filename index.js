const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const port = process.env.PORT || 9000
const app = express()

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4jm04.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

// for verified toke 
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ messege: 'unatuhorije' })
  jwt.verify(token, process.env.SECRETE_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: 'Invalid or expired token.' })
    }
    req.user = decoded
  })
  next()
}

async function run() {
  try {
    await client.db('admin').command({ ping: 1 })

    const addedJobs = client.db('newJob').collection('added-jobs');
    const jobsBidCol = client.db('newJob').collection('bids');

    // generate jwt
    app.post('/jwt', async (req, res) => { 
      const email = req.body
      const token = jwt.sign(email, process.env.SECRETE_KEY, { expiresIn: '36d' })
      res
        .cookie('token', token, {
          httpOnly: true,
          strict: false,
          deprecationErrors: true,
        })
        .send({sucess: true})
    })

    // logout jwt token
    app.get('/logout', async (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false,
      })
      .send({success : true})
    })


    app.post('/added-jobs', async (req, res) => { 
      const newjob = req.body;
      const result = await addedJobs.insertOne(newjob);
      res.send(result);
    })

    app.get('/jobs', async (req, res) => {
      const alljobs = await addedJobs.find().toArray();
      res.send(alljobs);
    })

    // get all jobs posted by spacific users
    app.get('/jobs/:email', verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email
      const email = req.params.email;
      if(decodedEmail!== email) {
        return res.status(401).send('Unauthorized to access this data')
      }
      const query = { 'buyer.email': email }
      const result = await addedJobs.find(query).toArray();
      res.send(result);
    })

    // to post bids data
    app.post('/add-bids', async (req, res) => { 
      const newBids = req.body;
      // to find the user already added
      const query = { email: newBids.email, jobId: newBids.jobId }
      const alreadyExist = await jobsBidCol.findOne(query)
      if(alreadyExist) {
        return res.status(400).send('User already added bid for this job')
      }

      const result = await jobsBidCol.insertOne(newBids);

      // to incress bid count
      const filter = { _id: new ObjectId(newBids.jobId) }
      const update = {
        $inc: {
          bit_count: 1
      }}
      const updateBidCount = await addedJobs.updateOne(filter, update)
      res.send(result);
    })

    // to get all bits data
    app.get('/bids', async (req, res) => {
      const allbids = await jobsBidCol.find().toArray();
      res.send(allbids);
    })

    // to get all bits data for specific users
    app.get('/bids/:email',verifyToken, async(req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email
      const isBuyer = req.query.buyer;
      if(decodedEmail!== email) {
        return res.status(401).send('Unauthorized to access this data')
      }
      let query = {}
      if (isBuyer) {
        query.buyer = email;
      }
      else {
        query.email = email;
      }
      const result = await jobsBidCol.find(query).toArray();
      res.send(result);
    })

    // to update bids status
    app.patch('/bids-update/:id', async (req, res) => { 
      const id = req.params.id;
      const {status} = req.body;
      const filter = {_id: new ObjectId(id)}
      const update = {
        $set:{status}
      }
      const result = await jobsBidCol.updateOne(filter, update);
      res.send(result)
    })

    // get all jobs
    app.get('/all-jobs-data', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;

      let options = {sort: {validity:  sort === 'asc' ? 1 : -1}}
      let query = {
        jobTitle: {
          $regex: search, $options: 'i'
        }
      }
      if (filter) query.category = filter
      const result = await addedJobs.find(query, options).toArray();
      res.send(result);
    })

    await client.connect()

    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
