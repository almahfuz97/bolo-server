const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
// const { ObjectID } = require('bson');

require('dotenv').config();

const app = express();

// middle ware 
app.use(cors());
app.use(express.json());

function auth(req, res, next) {
    const token = req.headers.authorization.split(' ')[1];
    const userEmail = req.query.email;
    const usr = req.query;
    if (!token) res.send({ success: false, message: 'Unauthorized token' })

    try {
        const user = jwt.verify(token, process.env.TOKEN_SECRET);

        console.log(user, userEmail)
        if (user.userEmail.email === userEmail) {
            req.user = user;
            console.log('ikano aiseni', user)
            next();
        }
        else {
            res.send({ success: false, message: 'unauthorized email' })
        }


    } catch (err) {
        console.log('here', err)
        res.send({ success: false, message: err })
    }

}

const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

client.connect(err => {

    if (err) {
        console.log(err);
        return;
    }
    else {
        const postCollection = client.db('boloDb').collection('posts');

        app.post('/post', async (req, res) => {
            const post = {
                ...req.body,
                likes: 0,
                likedby: {},
            };
            console.log(post);
            const result = await postCollection.insertOne(post);
            console.log(result)
            res.send(result)
        })

        app.get('/posts', async (req, res) => {

            const cursor = postCollection.find({});
            const result = await cursor.toArray();
            console.log(result)
            res.send(result);
        })
        app.get('/post/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await postCollection.findOne(query);

            console.log(result.likes)
            res.send(result);
        })

        // likes
        //  const likesCollection = postCollection.collection('likes');
        app.get('/likes/:id', async (req, res) => {

        })

        // update likes
        app.put('/likes', async (req, res) => {
            const body = req.body;
            const postId = body.id;
            console.log(postId)
            const isLiked = body.isLiked;
            console.log(isLiked)
            const query = { _id: ObjectId(postId) }
            const post = await postCollection.findOne(query);
            let updatedDoc = {};
            let likedby = post.likedby;
            const userEmail = body.email;
            let totalLikes = Object.keys(likedby).length;

            if (isLiked) {

                likedby[userEmail] = true;
                console.log(likedby);
                totalLikes = Object.keys(likedby).length;


                updatedDoc = {
                    $set: {
                        likedby,
                        likes: totalLikes
                    }

                }
            }
            else {
                if (likedby[userEmail]) {
                    delete likedby[userEmail];
                    totalLikes = Object.keys(likedby).length;
                }

                updatedDoc = {
                    $set: {
                        likedby,
                        likes: totalLikes
                    }
                }
            }

            const result = await postCollection.updateOne(query, updatedDoc);
            console.log(result)

            res.send(result)
        })
    }
})

app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.TOKEN_SECRET);
    console.log(token)
    res.json({ token });
})

app.get('/services', auth, async (req, res) => {
    const user = req.user;
    res.json({ success: true, user })

})

app.listen(process.env.PORT, () => {
    client.connect(err => {
        const collection = client.db("test").collection("devices");

        if (err) console.log(err)
        else console.log("connected to mongo")
        // perform actions on the collection object
    });
    console.log('listening')
})