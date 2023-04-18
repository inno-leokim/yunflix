const express = require("express");
const mongodb = require('mongodb');
const bodyParser = require('body-parser');

const amqp = require('amqplib');

const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

//
// Connect to the database.
//
function connectDb() {
    return mongodb.MongoClient.connect(DBHOST) 
        .then(client => {
            return client.db(DBNAME);
        });
}

//
// Connect to the rabbit 
//

function connectRabbit() {  // Helper 
    return amqp.connect(RABBIT) 
            .then(messagingConnection => {
                return messagingConnection.createChannel() //메세징 채널
            })
}

function setupHandlers(app, db, messageChannel){
    const videosCollection = db.collection("videos");

    // app.post("/viewed", (req, res) => {
    //     console.log(req.body);
    //     const videoPath = req.body.videoPath;
    //     videosCollection.insertOne({videoPath: videoPath})
    //             .then(() => {
    //                 console.log(`Added video ${videoPath} to history`);
    //                 res.sendStatus(200);
    //             })
    //             .catch(err => {
    //                 console.error(`Error adding video ${videoPath} to history.`);
    //                 console.error(err && err.stack || err);
    //                 res.sendStatus(500); 
    //             })
                    
    // });

    function consumeViewedMessage(msg) { // Handler for coming messages.
        console.log("Received a 'viewed' message");

        const parsedMsg = JSON.parse(msg.content.toString()); // Parse the JSON message.
        
        return videosCollection.insertOne({ videoPath: parsedMsg.videoPath }) // Record the "view" in the database.
            .then(() => {
                console.log("Acknowledging message was handled.");
                
                messageChannel.ack(msg); // If there is no error, acknowledge the message.
            });
    };

    return messageChannel.assertQueue("viewed", {}) // Assert that we have a "viewed" queue.
        .then(() => {
            console.log("Asserted that the 'viewed' queue exists.");

            return messageChannel.consume("viewed", consumeViewedMessage); // Start receiving messages from the "viewed" queue.
        });
}

function startHttpServer(db, messageChannel){
    return new Promise(resolve => {
        const app = express();
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({extended: true}));

        setupHandlers(app, db, messageChannel);

        const port = process.env.PORT && parseInt(process.env.PORT) || 3000;

        app.listen(port, () => {
            resolve();
        });
    });
}

function main() {
    return connectDb()
        .then(db => {
            return connectRabbit()
                .then(messageChannel => {
                    return startHttpServer(db, messageChannel);
                });
        }); 
}

main().then(() => console.log("Microservice online."))
        .catch(err => {
            console.error("Microservice failed to start.");
            console.error(err && err.stack || err);
        });