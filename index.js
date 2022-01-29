const express=require('express')
const { MongoClient }  = require('mongodb')
const ObjectId = require('mongodb').ObjectId
const cors = require('cors')
const { v4: uuidv4 } = require('uuid');
const SSLCommerzPayment = require('sslcommerz') // sslcommerz for payment system

require('dotenv').config()
const port = process.env.PORT || 5000

// initial express app
const app = express()
// express middleware
app.use(cors())
app.use(express.json())
app.use(
    express.urlencoded({
      extended: true
    })
  )
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
        const reviewCollection = database.collection('review');
        const adminCollection = database.collection('admin');
        const payment = database.collection("payment_record")
        console.log('Database Connected Successfully')
        // review submit post request
        app.post('/admin',async(req,res)=>{
            const review = req.body
            const result =await adminCollection.insertOne(review)
            res.json(result)
        })
        
        // review submit get request
        app.get('/admin',async(req,res)=>{
            let query = {}
            let email = req.query.email
            if(email){
            	query ={email:email}
            }
            const result =await adminCollection.find(query).toArray()
            res.json(result[0])
        })
        // review submit post request
        app.post('/review',async(req,res)=>{
            const review = req.body
            const result =await reviewCollection.insertOne(review)
            res.json(result)
        })
        
        // review submit get request
        app.get('/review',async(req,res)=>{
            let query ={}
            const result =await reviewCollection.find(query).toArray()
            res.json(result)
        })
        // orders submit post request
        app.post('/orders',async(req,res)=>{
            const item = req.body
            const result =await orders.insertOne(item)
            res.json(result)
        })
        // orders submit get request
        app.get('/orders',async(req,res)=>{
            const email = req.query.email
            let query ={}
            if(email){
            	query = {email:email}
            }
            const result =await orders.find(query).toArray()
            res.json(result)
        })
        
        // orders delet request
        app.delete('/orders/:id',async(req,res)=>{
            const id= req.params.id
            const query = {_id:ObjectId(id)}
            const result =await orders.deleteOne(query)
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
        
        // products delet request
        app.delete('/products/:id',async(req,res)=>{
            const id= req.params.id
            const query = {_id:ObjectId(id)}
            const result =await products.deleteOne(query)
            res.json(result)
        })
        
        //one orders get request
        app.get('/products/:id',async(req,res)=>{
            const id = req.params.id
            const query = {_id:ObjectId(id)}
            const result =await products.find(query).toArray()
            res.json(result[0])
        })


        // sslcommerz payment system integration initialize

        app.post('/init',async(req,res)=>{
            let {name,email,address,phone,date,order}= req.body
            const data = {
                total_amount: order?.price,
                currency: 'BDT',
                tran_id: uuidv4(),
                payment_status:"pending",
                success_url: 'http://localhost:5000/success',
                fail_url: 'http://localhost:5000/fail',
                cancel_url: 'http://localhost:5000/cancel',
                ipn_url: 'http://localhost:5000/ipn',
                shipping_method: 'Courier',
                product_id:order?._id,
                product_name: order?.product,
                product_category: 'Electronic',
                product_image:order?.photo,
                product_profile: order?.description,
                cus_name: name,
                cus_email: email,
                cus_add1: address,
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: phone,
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
                ship_date:date,
                multi_card_name: 'mastercard',
                value_a: 'ref001_A',
                value_b: 'ref002_B',
                value_c: 'ref003_C',
                value_d: 'ref004_D'
            };
            const sslcommer = new SSLCommerzPayment(process.env.STORE_ID, process.env.STORE_PASSWORD,false) //true for live default false for sandbox
            const record =await payment.insertOne(data)
            sslcommer.init(data).then((data) => {
                if(data.GatewayPageURL){
                    //process the response that got from sslcommerz 
                    //https://developer.sslcommerz.com/doc/v4/#returned-parameters
                    res.json(data.GatewayPageURL)
                }else{
                    return res.status(400).json({
                        message: "SSL session was not successful"
                    })
                }
            });
        })

            // sslcommerz payment succes page 
            app.post('/success',async(req,res)=>{
                // update payment validation id 
                const record = await payment.updateOne({tran_id:req.body.tran_id},{
                    $set:{
                        val_id:req.body.val_id
                    }
                })
                res.redirect(`https://hair-care-pk.netlify.app/payment-success/${req.body.tran_id}`)
            })
            // sslcommerz payment cancel page 
            app.post('/cancel',async(req,res)=>{
                // if user cancel this order then autometically delete this data 
                const record = payment.deleteOne({tran_id:req.body.tran_id})
                res.redirect("https://hair-care-pk.netlify.app/payment-cancel")
            })
            // sslcommerz payment fail page 
            app.post('/fail',async(req,res)=>{
                // if user cancel this order then autometically delete this data 
                const record = payment.deleteOne({tran_id:req.body.tran_id})
                res.redirect("https://hair-care-pk.netlify.app/payment-failed")
            })
            app.post("/ipn", (req, res) => {
                console.log(req.body)
                res.send(req.body);
            })


            // api for  finding specific transaction info
            app.get("/orders/:id",async(req,res)=>{
                const id = req.params.id
                const result = await payment.findOne({tran_id:id})
                res.json(result)
            })
            // validate actual order if its real or not
            app.post("/validate",async(req,res)=>{
                const product =await payment.findOne({tran_id:req.body.tran_id})
                if(product.val_id === req.body.val_id){
                    const record = await payment.updateOne({tran_id:req.body.tran_id},{
                        $set:{
                            payment_status: "Successful"
                        }
                    })
                    res.send(record.modifiedCount>0)
                }else{
                    res.json({
                        message:"Chor Detected!"
                    })
                }
            }) 
    }finally{
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

mainDB().catch(console.dir())

// express server open
app.listen(port, ()=> console.log('Server Start at ',port))
