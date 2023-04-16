const express = require("express");
const http = require('http');
const fs = require('fs');
require("dotenv").config();
const Minio = require("minio");
const mongoDB = require('mongodb');

const app = express();

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

function main(){
    return mongoDB.MongoClient.connect(DBHOST)
                .then(client => {
                    const db = client.db(DBNAME);
                    const videosCollection = db.collection("videos");

                    app.get("/video", (req, res) => {
                        const videoId = new mongoDB.ObjectId(req.query.id);
                        videosCollection.findOne({_id: videoId})
                                        .then(videoRecord => {
                                            if (!videoRecord){
                                                res.sendStatus(404);
                                                return;
                                            }
                                            
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

