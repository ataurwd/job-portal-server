require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3000;

const app = express();
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
// app.use(cors());

const checkValididy = (req, res, next) => { 
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ error: 'Access Denied. No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: 'Invalid or expired token.' });
    }
    req.user = decoded; // Optionally pass user info
    next();
  });
};



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4jm04.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
      await client.db("admin").command({ ping: 1 });
    const jobPostCollection = client.db('jobs').collection('added-jobs');
    
    // auth related api
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,

        })
        .send({success: true})
    })

    // clear cookies when logout
    app.post('/logout', async (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false,
      })
      .send({success : true})
    })

    // to get all added jobs
    app.get('/added-jobs', checkValididy, async (req, res) => {
      if(req.user.email !== req.query.email){ 
          return res.status(401).json({ error: 'Access Denied. User does not match.' });  // check user email if it's correct or not
        }
        const result = await jobPostCollection.find().toArray()
        res.json(result);
      })

    // to post jobs
      app.post('/add-job', async (req, res) => {
        const newJob = req.body;
        await jobPostCollection.insertOne(newJob);
        res.send(newJob);
      })
    
    // to details job by id
    app.get('/jobs/:id', async(req, res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobPostCollection.findOne(query);
      res.send(result);
    })

    // to add search result by title
    app.get('/search', async (req, res) => {
      const { title  } = req.query;      
    let option = {}
    if (title) {
      option = { jobTitle: { $regex: title, $options: 'i' } };
    }
      const result = await jobPostCollection.find(option).toArray();
      res.send(result);
  });


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);



app.get('/', (req, res) => { 
    res.send('Hello from the job server!');
})

app.listen(port)
