const express=require('express')
const { MongoClient }  = require('mongodb')
const ObjectId = require('mongodb').ObjectId
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000

// initial express app
const app = express()
// express middleware
app.use(cors())
app.use(express.json())

// app initial page get request
app.get('/',(req,res)=>{
    res.send('Server start Successfully')
})


// database connect

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rtuf5.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function mainDB(){
    try{
        await client.connect()
        const database = client.db('hair-care-shampo');
        const products = database.collection('products');
        const orders = database.collection('orders');
        console.log('Database Connected Successfully')
        // orders submit post request
        app.post('/orders',async(req,res)=>{
            const item = req.body
            const result =await orders.insertOne(item)
            res.json(result)
        })
        // orders submit get request
        app.get('/orders',async(req,res)=>{
            const query = {}
            const result =await orders.find(query).toArray()
            res.json(result)
        })
        // orders post request
        app.post('/products',async(req,res)=>{
            const item = req.body
            const result =await products.insertOne(item)
            res.json(result)
        })
        // last 6 orders get request
        app.get('/home/products',async(req,res)=>{
            const query = {}
            const result =await products.find(query).sort({ $natural: -1 }).limit(6).toArray()
            res.json(result)
        })
        // orders get request
        app.get('/products',async(req,res)=>{
            const query = {}
            const result =await products.find(query).toArray()
            res.json(result)
        })
        
        //one orders get request
        app.get('/products/:id',async(req,res)=>{
            const id = req.params.id
            const query = {_id:ObjectId(id)}
            const result =await products.find(query).toArray()
            res.json(result[0])
        })
    }finally{
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

mainDB().catch(console.dir())

// express server open
app.listen(port, ()=> console.log('Server Start at ',port))
