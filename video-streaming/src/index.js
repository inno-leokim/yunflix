const express = require("express");
const http = require('http');
const fs = require('fs');
require("dotenv").config();
const Minio = require("minio");
const mongoDB = require('mongodb');
const amqp = require('amqplib');

const app = express();

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const RABBIT = process.env.RABBIT;


//
// Connect to the database.
//
function connectDb() {
    return mongoDB.MongoClient.connect(DBHOST) 
        .then(client => {
            return client.db(DBNAME);
        });
}

//
// Connect to the RabbitMQ server.
//
function connectRabbit() {

    console.log(`Connecting to RabbitMQ server at ${RABBIT}.`);

    return amqp.connect(RABBIT) // Connect to the RabbitMQ server.
        .then(connection => {
            console.log("Connected to RabbitMQ.");

            return connection.createChannel(); // Create a RabbitMQ messaging channel.
        });
}

function sendViewedMessage(messageChannel, videoPath) {

    // Messaging

    console.log(`Publishing message on "viewed" queue.`);

    const msg = { videoPath: videoPath };
    const jsonMsg = JSON.stringify(msg);
    messageChannel.publish("", "viewed", Buffer.from(jsonMsg)); // Publish message to the "viewed" queue. 메세지를 queue에 전송한다.


    // RestAPI

    // const postOptions = {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json",
    //     }
    // };

    // const requestBody = {
    //     videoPath: videoPath
    // };

    // const req = http.request(
    //     "http://history/viewed",
    //     postOptions
    // );

    // req.on("close", () => {
    //     console.log("Sent 'viewed' message to history microservice.");
    // });

    // req.on("error", (err) => {
    //     console.error("Failed to send 'viewed' message!");
    //     console.error(err && err.stack || err);
    // });

    // req.write(JSON.stringify(requestBody));
    // req.end();
}

function main(){

    /**
     * MQ
     */
    return connectDb()
            .then(db => {
                return connectRabbit()
                        .then(messageChannel => {
                            const videosCollection = db.collection("videos");

                            app.get("/video", (req, res) => {
                                const videoId = new mongoDB.ObjectId(req.query.id);
                                console.log(req.query);
                                videosCollection.findOne({_id: videoId})
                                                .then(videoRecord => {
                                                    if (!videoRecord){
                                                        res.sendStatus(404);
                                                        return;
                                                    }
                                                    
                                                    console.log(videoRecord.videoPath);
                                                    const forwardRequest = http.request(
                                                        {
                                                            host: VIDEO_STORAGE_HOST,
                                                            port: VIDEO_STORAGE_PORT,
                                                            path: `/video/${videoRecord.videoPath}`,
                                                            method: 'GET',
                                                            headers: req.headers
                                                        },
                                                        forwardResponse => {
                                                            res.writeHead(forwardResponse.statusCode, forwardResponse.headers);
                                                            forwardResponse.pipe(res);
                                                        }
                                                        );
                                                        
                                                        req.pipe(forwardRequest);
                                                        
                                                        // 메세지 전송
                                                        sendViewedMessage(messageChannel, videoRecord.videoPath);
        
                                                }).catch(err => {
                                                    console.error("Database query failed.");
                                                    console.error(err && err.stack || err);
                                                    res.sendStatus(500);
                                                });
                            });
        
                            app.listen(PORT,  () => {
                                console.log(`Example app listening 
                                                on port ${PORT}`);
                            });
                        });
            })

    /**
     * Rest API
     */
    return mongoDB.MongoClient.connect(DBHOST)
                .then(client => {
                    const db = client.db(DBNAME);
                    const videosCollection = db.collection("videos");

                    app.get("/video", (req, res) => {
                        const videoId = new mongoDB.ObjectId(req.query.id);
                        // console.log(req.query);
                        videosCollection.findOne({_id: videoId})
                                        .then(videoRecord => {
                                            if (!videoRecord){
                                                res.sendStatus(404);
                                                return;
                                            }
                                            
                                            console.log(videoRecord.videoPath);
                                            const forwardRequest = http.request(
                                                {
                                                    host: VIDEO_STORAGE_HOST,
                                                    port: VIDEO_STORAGE_PORT,
                                                    path: `/video/${videoRecord.videoPath}`,
                                                    method: 'GET',
                                                    headers: req.headers
                                                },
                                                forwardResponse => {
                                                    res.writeHead(forwardResponse.statusCode, forwardResponse.headers);
                                                    forwardResponse.pipe(res);
                                                }
                                                );
                                                
                                                req.pipe(forwardRequest);
                                                
                                                // 메세지 전송
                                                sendViewedMessage(videoRecord.videoPath);

                                        }).catch(err => {
                                            console.error("Database query failed.");
                                            console.error(err && err.stack || err);
                                            res.sendStatus(500);
                                        });
                    });

                    app.listen(PORT,  () => {
                        console.log(`Example app listening 
                                        on port ${PORT}`);
                    });
                });
}

main().then(() => console.log("Microservice online"))
        .catch(err => {
            console.error("Microservice failed to start");
            console.error(err && err.stack || err);
        });

// main();

// app.get("/video", (req, res) => {
//     console.log('tset');
//     const forwardRequest = http.request(
//         {
//             host: VIDEO_STORAGE_HOST,
//             port: VIDEO_STORAGE_PORT,
//             path: '/video/sample_video.mp4',
//             method: 'GET',
//             headers: req.headers
//         },
//         forwardResponse => {
//             res.writeHead(forwardResponse.statusCode, forwardResponse.headers);
//             forwardResponse.pipe(res);
//         }
//     )
    
//     req.pipe(forwardRequest);
    
// });

// app.listen(PORT,  () => {
//     console.log(`Example app listening 
//                     on port ${PORT}`);
// });

