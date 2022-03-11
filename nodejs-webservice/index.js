// Import packages.
const express = require('express')
const redis = require('redis')
const { promisify } = require('util')

// Create and configure a webserver.
const app = express()
app.use(express.json())

// Create and configure a Redis client.
const redisClient = redis.createClient(process.env.REDIS_URL)
redisClient.on('error', error =>  console.error(error))
const redisSet = promisify(redisClient.set).bind(redisClient)
const redisGet = promisify(redisClient.get).bind(redisClient)

// Create endpoint for hello msg
app.get('/hello', (req, res) => {
    return res.send('Hello V1');
});

// Create an endpoint to set a key value pair.
app.post('/setValue', async (req, res) => {
    if (req.body.key && req.body.value) {
        try {
            await redisSet(req.body.key, req.body.value)
            res.send()
        } catch (e) {
            res.json(e)
        }
    } else {
        res.status(400).json({ error: 'Wrong input.' })
    }
})

// Create an endpoint to get a key value pair.
app.get('/getValue/:key', async (req, res) => {
    if (!req.params.key) {
        return res.status(400).json({ error: 'Wrong input.' })
    }

    try {
        const value = await redisGet(req.params.key)
        res.json(value)
    } catch (e) {
        res.json(e)
    }
})

// Start the webserver.
app.listen(3000, () => {
    console.log('Server is up on port 3000')
})