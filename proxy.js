const request = require('request');
const ReqHistory = require('./history');
var selfsigned = require('selfsigned');

const certCache = {};

const createCert = function(name) {
    const attrs = [{ name: 'commonName', value: name}];
    const pem = selfsigned.generate(attrs, {
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [{ name: 'basicConstraints', cA: true }],
    });
    certCache[name] = pem;

    return pem;
}

// Save request to MongoDB
function save(req) {
    const newReqHistory = new ReqHistory({
        request: req,
    });

    newReqHistory.save((err, data) => {
        if (!err) {
            console.log('OK');
            console.log(data);
        } else {
            console.error('ERROR');
            console.log(err);
        }
    });
}

function extract(req) {
    const { url, cookies, ip, method, params, path, query, body, headers, protocol } 
    return { url, cookies, ip, method, params, path, query, body, headers, protocol } = req;
}

const pass = function(req, res) {
    if (req.method === 'CONNECT' && !certCache[req.headers.host]) {
        createCert(req.headers.host);
    }

    /*
    Проверяет что было выставленно в квере запросе... 
    Если число, то совершит запрос под этим номером повторно,
    а если id = "all", то выведет список всех запросов, сохранненых в бд 
    */
    if (req.headers.host === 'localhost') {
        if (req.query.id) {
            proxyResend(req, res);
            return;
        }
        res.sendStatus(200);
        return;
    }

    const data = extract(req);
    save(data); // save in MongoDB

    const target = `${req.protocol}://${req.headers.host}${req.path}`;
    console.log('to: ', target);
    sendToTarget(req, res, target);
}

function processRequest(req, options) {
    if (req.method === 'GET' || req.method === 'HEAD') {
        return request.get(options);
    } else if (req.method === 'POST') {
        return request.post(options, req.body);
    } else if (req.method === 'PUT') {
        return request.put(options, req.body);
    } else if (req.method === 'PATCH') {
        return request.patch(options, req.body);
    }
}

function sendToTarget(req, res, target) {
        const options = {
            url: target,
            headers: req.headers,
            agentOptions: req.method === 'HTTPS' ? {
                key: certCache[req.headers.host] ? certCache[req.headers.host].private : createCert(req.headers.host).private ,
                ca: certCache[req.headers.host] ? certCache[req.headers.host].public : createCert(req.headers.host).public,
            } : null,
        };
         
        processRequest(req, options).on('error', (error) => res.status(502).send(error.message))
        .pipe(res)
}

function proxyResend(req, res) {
    if (!req.query.id) {
        res.sendStatus(502);
        return;
    }

    if (req.query.id === 'all') {
        sendList(res);
        return;
    }

    resend(req.query.id, req, res, `${req.protocol}://${req.headers.host}${req.path}`);
}

function sendList(res) {
    ReqHistory.find({}, '_id request', (err, requests) => {
        if (err) {
          res.sendStatus(500);
        } else {
          const result = requests.map((req) => req._id);
          res.send({ result });
        }
    }).sort({_id: -1});
}

function resend(id, req, res, target) {
    ReqHistory.findById(id, (err, request) => {
        if (err) {
            res.sendStatus(404);
            return;
        } 

        sendToTarget(request.request, res, target);
    });
}

module.exports = {
    pass: pass,
    createCert: createCert,
};
