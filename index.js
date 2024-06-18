const express = require('express');
const app = express();
const cors= require('cors');
var jwt = require('jsonwebtoken');
const port= process.env.PORT || 5000;
require('dotenv').config()
//middleware
app.use(cors())
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mtdunhe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const database = client.db("blood-bridge");
    const users = database.collection("users");
    const requestCollections = database.collection("requestCollections");

    app.post('/jwt',async(req,res)=>{
      const user= req.body;
      const token= jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' })
      res.send({token})
    })
    const verifyToken=(req,res,next)=>{
        if(!req.headers.authorization){
          return res.status(401).send({message: 'Unauthorized access'})
        }
        const token= req.headers.authorization;
        console.log({token})
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
          if(err){
            return res.status(401).send({message: 'Unauthorized Access'})
          }
          req.decoded= decoded;
          next();
        })
    }
    const verifyAdmin=async(req,res,next)=>{
        const email= req.decoded.email;
        const query= {email:email}
        const user= await users.findOne(query)
        const isAdmin= user?.role==='admin'
        if(!isAdmin){
          return res.status(403).send({message: 'forbidden access'})
        }
        next();
    }
    const verifyVolunteer=async(req,res,next)=>{
        const email= req.decoded.email;
        const query= {email:email}
        const user= await users.findOne(query)
        const isVolunteer= user?.role==='volunteer'
        if(!isVolunteer){
          return res.status(403).send({message: 'forbidden access'})
        }
        next();
    }
    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
        // console.log(req.headers)
        const result = await users.find().toArray();
        res.send(result)
    })
    app.get('/getadmin/:email',verifyToken,async(req,res)=>{
        const email= req.params.email;
        if(email!=req.decoded.email){
          return res.status(403).send({message: 'Forbidden'})
        }
        const query = { email: email};
        const result= await users.findOne(query)
        let admin=false;
        if(result){
            admin= result?.role==='admin'
        }
        res.send({admin});

    })
    app.get('/getvolinteer/:email',verifyToken,async(req,res)=>{
        const email= req.params.email;
        if(email!=req.decoded.email){
          return res.status(403).send({message: 'Forbidden'})
        }
        const query = { email: email};
        const result= await users.findOne(query)
        let volunteer=false;
        if(result){
            volunteer= result?.role==='volunteer'
        }
        res.send({volunteer});

    })

    app.post('/adduser',async(req,res)=>{
        const userInfo= req.body;
        const email= userInfo.email;
        const query={email: email};
        const existingUser= await users.findOne(query)
        if(existingUser){
          return res.send({message:'user alreay exists', insertedId: null})
        }
        const result= await users.insertOne(userInfo);
        res.send(result)
    })
    app.post('/donationrequest',async(req,res)=>{
        const requestInfo= req.body;
        const result= await requestCollections.insertOne(requestInfo);
        res.send(result)
    })
    app.get('/getdonationrequests/:email',verifyToken,async(req,res)=>{
        const email= req.params.email;
        const query = { email: email};
        const options = {
            sort: { donationDate: -1 }
        };
        const result = await requestCollections.find(query,options).toArray();
        res.send(result)
    })

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Server is running')
})

app.listen(port,()=>{
    console.log(`server is running on ${port}`)
})