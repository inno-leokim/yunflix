const express = require("express")
const fs = require('fs');
require("dotenv").config();
const Minio = require("minio");

const app = express();

const minioClient = new Minio.Client({
    endPoint: process.env.HOST,
    port: 9000,
    useSSL: false,
    accessKey: process.env.ACCESS_KEY,
    secretKey: process.env.SECRET_KEY,
    
});

if(!process.env.PORT) {
    throw new Error(`Please specify the port number
        for the HTTP server with the environment variable PORT.`);
}

const PORT = process.env.PORT;

app.get("/video/:videoPath", (req, res) => {
    // const path = 
    //         "./videos/sample_video.mp4";

    // fs.stat(path, (err, stats) => {
    //     if(err) {
    //         console.error("An error occured");
    //         res.sendStatus(500);
    //         return;
    //     }

    //     res.writeHead(200, {
    //         "Content-Length": stats.size,
    //         "Content-Type": "video/mp4",
    //     });

    //     fs.createReadStream(path).pipe(res);
    // })
    const videoPath = req.params.videoPath;

    let size = 0;
    let data;
    minioClient.getObject('videos', videoPath).then(result => {
        result.on('data', (chunk) => {
            size += chunk.length;
            data = !data ? new Buffer.from(chunk) : Buffer.concat([data, chunk]);
        })

        result.on('end', (stats) => {
            console.log('End. Total size = ' + size);
            res.writeHead(200, {
                "Content-Length": size,
                "Content-Type": "video/mp4",
            });
            res.write(data);
            res.end();
        })
    })
    
});

app.listen(PORT,  () => {
    console.log(`Example app listening 
                    on port ${PORT}`);
});

