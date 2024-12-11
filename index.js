require('dotenv').config();
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000;

const app = express();
app.use(cors());


app.use(express.json());
app.use(cors());


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

    // to get all added jobs
      app.get('/added-jobs', async(req, res) => {
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

//q17oIBiFlJTMETOY
//jobfinding809