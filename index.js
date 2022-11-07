const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
// const http = require('http');
// const { Server } = require('socket.io')
// const { ObjectID } = require('bson');

require('dotenv').config();

const app = express();

// middle ware 
app.use(cors());
app.use(express.json());

// socket io
// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: "https://bolo-server.vercel.app",
//     method: ["GET", "POST", "DELETE", "PUT"]
// })

// module.exports = io;

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

async function run() {
    const postCollection = client.db('boloDb').collection('posts');

    console.log('connection')


    app.post('/post', async (req, res) => {
        const post = {
            ...req.body,
            likes: 0,
            likedby: {},
        };
        const result = await postCollection.insertOne(post);
        res.send(result)
    })

    app.get('/posts', async (req, res) => {

        const option = {
            sort: {
                "createdAt": -1
            }
        }
        const cursor = postCollection.find({}, option);
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/post/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await postCollection.findOne(query);
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
        const isLiked = body.isLiked;
        const query = { _id: ObjectId(postId) }
        const post = await postCollection.findOne(query);
        let updatedDoc = {};
        let likedby = post.likedby;
        const userEmail = body.email;
        let totalLikes = Object.keys(likedby).length;

        if (isLiked) {

            likedby[userEmail] = true;
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
        res.send(result)
    })

    // comments
    const commentsCollection = client.db('boloDb').collection('comments');

    app.get('/comments/:id', async (req, res) => {
        const postId = req.params.id;
        const post = await postCollection.findOne({ _id: ObjectId(postId) });
        console.log(post)
        res.send(post);
    })


    app.post('/comments', async (req, res) => {
        const commentInfo = req.body;
        console.log(commentInfo);
        const result = await commentsCollection.insertOne(commentInfo);
        console.log(result)
        res.send(result);
    })
    app.get('/comments', async (req, res) => {
        const postId = req.query.postId;
        const option = {
            sort: { "time": -1 }
        }
        const cursor = commentsCollection.find({ postId: postId }, option);
        const comments = await cursor.toArray();
        console.log(comments)
        res.send(comments);
    })
}

run().catch(console.dir)

app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.TOKEN_SECRET);
    res.json({ token });
})

app.get('/services', auth, async (req, res) => {
    const user = req.user;
    res.json({ success: true, user })

})

app.get('/', (req, res) => {
    res.send('server running')
})

app.listen(process.env.PORT, () => {
    console.log('listening', process.env.PORT)
})