const serverless = require('serverless-http');
const express = require('express');
const fs = require('fs');
const openpgp = require('openpgp');
const async = require('async');
const bodyParser = require('body-parser');
const { json } = require('body-parser');

const app = express();
app.use(express.json({ limit: '50mb' }));

var passphrase = "super long and hard to guess secret"
app.get('/api/generateKey', async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    let key = await generateKeyPair()
    console.log(key.publicKey)
    console.log(key.privateKey)
    res.send(JSON.stringify(key))

})
const generateKeyPair = async () => {
    const key = await openpgp.generateKey({
        curve: 'ed25519',
        userIDs: [
            {
                name: 'Jay Nguyen Vn', email: 'jay.nguyen@jcurvesolutions.com',
                comment: 'This key is for public sharing'
            }
        ],
        passphrase: 'super long and hard to guess secret',
    });
    return key;
}
app.post('/api/encrypt', async (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    let data = await encrypted(req.body.plainText, req.body.publicKey)
    if(!data){
        res.send(400,JSON.stringify({
            status:"error",
            "msg": "public key is  wrong!"
        }))    
    }
    else{
        res.send(JSON.stringify({
            status: 'success',
            data: data
        }))    
    }
   
    
})
app.post('/api/decrypt', async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    let data = await decrypted(req.body.encryptText, req.body.privateKey)
    if(!data){
        res.send(400,JSON.stringify({
            status:"error",
            "msg": "private key is wrong!"
        }))    
    }
    else{
        res.send(JSON.stringify({
            status: 'success',
            data: data
        }))    
    }
  
})

const encrypted = async (plainText, publicKey) => {
    try {
        console.log("plainText", plainText);
        console.log("publicKey", publicKey);
        const publicKey1 = await openpgp.readKey({ armoredKey: publicKey });
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: plainText }),
            encryptionKeys: publicKey1
        })
        console.log(encrypted)
        return encrypted;
        
    } catch (error) {
        console.log("error",error);

    }
   
}
const decrypted = async (plainText, privateKey) => {
    try {
        const privateKey1 = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: privateKey }),
            passphrase
        })
    
        const message = await openpgp.readMessage({
            armoredMessage: plainText // parse armored message
        });
        const data = await openpgp.decrypt({
            message,
            decryptionKeys: privateKey1
        });
        console.log(data); // 
        return data;
        
    } catch (error) {
        console.log("error",error);
    }
   
}

const port = process.env.port || 3000;
if(process.env.ENVIRONMENT==='lambdar'){
    module.exports.handler = serverless(app);
}
else{
    app.listen(port, () => console.log('server running'));
}
