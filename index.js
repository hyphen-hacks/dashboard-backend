const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const uuidv4 = require('uuid/v4');
const CryptoJS = require("crypto-js");
const whitelist = ['https://hyphen-hacks.com', 'https://waivers.hyphen-hacks.com', 'https://dashboard.hyphen-hacks.com', 'http://hyphen-hacks.com', 'http://waivers.hyphen-hacks.com', 'http://dashboard.hyphen-hacks.com', 'http://localhost:8080', 'https://staging.hyphen-hacks.com', 'http://localhost:1313', 'https://emails.hyphen-hacks.com', 'http://emails.hyphen-hacks.com']
const moment = require('moment')
let log = require('log4node');
const path = require('path'),
  analyticsPath = path.join(__dirname, './private/analyticsResult.json');


log.reconfigure({level: 'debug', file: './private/logs.log'});
const corsOptions = {
  origin: whitelist,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
const version = require('./package').version
const startTime = moment().format('MMM Do, HH:mm:ss')

log.info(`Hyphen-Hacks Server API Init ${startTime} v${version}`)
//console.log('cors whitlist', whitelist)
admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});
const db = admin.firestore();
let apiKeyAuth = uuidv4();
db.collection('secrets').doc('apiKeyDashboard').set({
  key: apiKeyAuth,
  time: Date.now()
}).then(doc => {

  log.info('auth key intalized', apiKeyAuth)
})
db.collection('secrets').doc('apiKeyDashboard').onSnapshot(docSnapshot => {
  log.info(`API key Updated: ${docSnapshot.data().key}`);
  apiKeyAuth = docSnapshot.data().key
}, err => {
  log.error(`Encountered error updating api key: ${err}`);
});
let eventbriteData = []
console.log(`Hyphen-Hacks Server API Init ${startTime} v${version} ${apiKeyAuth}`)

function getEventbriteAttendees(url) {
  return new Promise(
    function (resolve, reject) {
      log.info('fetching eventbrite attendess at ' + url)
      fetch(url, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + keys.eventbriteAPIKey,
        }
      }).then((resp) => resp.json()).then(data => {
        if (data.error) {
          log.error(data.error, data.error_description, 'eventbrite fetch')
        } else {
          const cleanedAttendees = data.attendees.map(i => {
            const b = {
              "resource_uri": i.resource_uri,
              "id": i.id,
              "changed": i.changed,
              "created": i.created,
              "quantity": i.quantity,
              "variant_id": i.variant_id,
              "profile": i.profile,
              // "phone": i.mo,
              gender: i.gender,
              age: i.age,
              "birth_date": i.birth_date,
              "email": i.email,
              "name": i.name,
              answers: i.answers,
              "ticket_class_name": i.ticket_class_name,
              "event_id": i.event_id,
              "order_id": i.order_id,
              "ticket_class_id": i.ticket_class_id,
              waiverStatus: 0,
              waiverImage: null,
              checkedIn: false,
              onCampus: false,
              waiverReviewedBy: ''
            }
            eventbriteData.push(b)
            return b
          })

          if (data.pagination.has_more_items) {
            getEventbriteAttendees(`${keys.eventbriteURL}?continuation=${data.pagination.continuation}`)
          }
          resolve(cleanedAttendees)
        }
        // console.log(data)

      })
      .catch(function (e) {
        console.error(e)
      });
    }
  )
}

const updateFirebaseWithNewEventbriteData = async () => {
  log.info('updating firebase with eventbrite...')
  await getEventbriteAttendees(keys.eventbriteURL).then((e) => {
    fs.writeFile('./private/sample-api-return.json', JSON.stringify(eventbriteData), () => {
    })
    const peopleRef = db.collection('people');
    eventbriteData.forEach(i => {
      //console.log(JSON.stringify(i))
      peopleRef.doc(i.id).get().then((docSnapshot) => {
        if (docSnapshot.exists) {
        } else {
          let e = JSON.stringify(i)
          peopleRef.doc(i.id).set(JSON.parse(e));
          log.info(`added ${i.id} to firebase`)
        }
      });

    })
  })
  log.info('done updating firebase')
  return true
}
/*
updateFirebaseWithNewEventbriteData().then(e => {
  console.log('next')
})
*/
const express = require('express'),
  bodyParser = require('body-parser'),
  app = express(),
  port = 3000;
const cors = require('cors')
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors(corsOptions))


app.get('/', (req, res) => {
  res.redirect(301, 'https://hyphen-hacks.com')
})
app.get('/test', (req, res) => {
  res.send('HELLO')
})
app.get('/api/v1/logs', (req, res) => {
  log.info('got a request to get logs')

  if (req.headers.authorization === apiKeyAuth) {
    log.info('api good')
    const content = fs.readFileSync('./private/logs.log', 'utf8')
    // console.log(content);   // Put all of the code here (not the best solution)
    res.status(200)
    res.json(JSON.stringify({
      data: CryptoJS.AES.encrypt(JSON.stringify({
        time: Date.now(), data: content
      }), apiKeyAuth).toString()
    }))
    log.info('sent')// Or put the next step in a function and invoke it
    res.end()

  } else {
    log.error('invalid dashboard api key')
    res.status(401)
    res.send({error: {message: 'invalid dashboard api key'}})
    res.end()
  }
})
app.get('/api/v2/headerRow', (req, res) => {
  log.info('got a request to get stats')

  if (req.headers.authorization === apiKeyAuth) {
    log.info('api good')
    fs.readFile('./private/analyticsResults.json', {encoding: 'utf-8'}, function (err, data) {
      if (!err) {
        //  console.log('received data: ' + data);
        data = JSON.parse(data)
        const totalPeople = data.totalPeople
        const attendees = data.attendees
        const waiverStats = Math.round(((data.waiverStats.accepted.attendees + data.waiverStats.accepted.mentors + data.waiverStats.accepted.volunteers) / totalPeople) * 100)
        const females = Math.round((data.genderDistribution.attendees.Female / attendees) * 100)
        let bestYear = {
          year: '2020',
          people: 1
        }
        let bestRefferer = {
          refferer: '2020',
          people: 1
        }
        for (let key in data.graduationDistribution) {
          if (data.graduationDistribution.hasOwnProperty(key)) {
            if (data.graduationDistribution[key] > bestYear.people) {
              bestYear = {
                year: key,
                people: data.graduationDistribution[key]
              }
            }
          }
        }
        for (let key in data.refferer) {
          if (data.refferer.hasOwnProperty(key)) {
            if (data.refferer[key] > bestRefferer.people) {
              bestRefferer = {
                refferer: key,
                people: data.refferer[key]
              }
            }
          }
        }


        res.status(200)
        res.json(JSON.stringify({success: true, data: CryptoJS.AES.encrypt(JSON.stringify({
          headerRow: [
            {
              title: 'Waivers Completed',
              value: waiverStats + '%'
            },
            {
              title: 'Attendees',
              value: attendees
            },
            {
              title: '% Female',
              value: females + '%'
            },
            {
              title: 'Most Common Grad Year',
              value: bestYear.year
            },
            {
              title: 'Best Referral Source',
              value: bestRefferer.refferer
            }
          ]
        }), apiKeyAuth).toString()}))
        log.info('sent')// Or put the next step in a function and invoke it
        res.end()

      } else {
        console.log(err);
        res.status(500)
        res.json(JSON.stringify({
          success: false,
          error: {
            message: 'internal server error'
          }
        }))
        log.info('sent')// Or put the next step in a function and invoke it
        res.end()
      }
    });


  } else {
    log.error('invalid dashboard api key')
    res.status(401)
    res.send({error: {message: 'invalid dashboard api key'}})
    res.end()
  }
})
app.post('/api/v1/sendEmail', (req, res) => {
  log.info('got a request to send an email', req.body, req.origin)
  const body = req.body
  if (req.headers.authorization === apiKeyAuth) {
    log.info('api good')
    if (body.type === 'waiverAccepted') {
      if (body.name && body.email) {
        const mailBody = {
          "personalizations": [
            {
              "to": [
                {
                  "email": body.email,
                  "name": body.name
                }
              ],
              "dynamic_template_data": {
                "firstName": body.name
              }
            }
          ],
          "from": {
            "email": "noreply@hyphen-hacks.com",
            "name": "Ronan at Hyphen Hacks"
          },
          "reply_to": {
            "email": "support@hyphen-hacks.com",
            "name": "Ronan"
          },
          "template_id": "d-ba90d9bb312d40e197333692ca59e9ca",
          "tracking_settings": {
            "click_tracking": {
              'enable': true
            }
          }
        };
        // log.info(JSON.stringify(mailBody))
        fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'post',
          headers: {
            'Authorization': 'Bearer ' + keys.sendGrid,
            "content-type": "application/json"
          },
          body: JSON.stringify(mailBody)
        }).then(() => {
          log.info('success')
          res.status(200)
          res.send({success: true})
          res.end()
        }).catch(e => {
          log.error(e)
          res.status(500)
          res.send({error: e})
          res.end()
        });
      } else {
        res.status(400)
        res.send({error: {message: 'invalid request, must have email and name', type: 'missing parameter'}})
        res.end()
      }
    } else if (body.type === 'waiverDeclined') {
      log.info('sending decline email', body)
      if (body.name && body.email && body.message && body.url) {
        const mailBody = {
          "personalizations": [
            {
              "to": [
                {
                  "email": body.email,
                  "name": body.name
                }
              ],
              "dynamic_template_data": {
                "firstName": body.name,
                "message": body.message,
                "url": body.url
              }
            }
          ],
          "from": {
            "email": "noreply@hyphen-hacks.com",
            "name": "Hyphen-Hacks Team"
          },
          "reply_to": {
            "email": "team@hyphen-hacks.com",
            "name": "Hyphen-Hacks Team"
          },
          "template_id": "d-cf571f96327a46bb969d9f207826ee57",
          "tracking_settings": {
            "click_tracking": {
              'enable': true
            }
          }
        };
        log.info(JSON.stringify(mailBody))
        fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'post',
          headers: {
            'Authorization': 'Bearer ' + keys.sendGrid,
            "content-type": "application/json"
          },
          body: JSON.stringify(mailBody)
        }).then(() => {
          log.info('Success! Mail sent to' + body.email)
          res.status(200)
          res.send({success: true})
          res.end()
        }).catch(e => {
          log.error(e)
          res.status(500)
          res.send({error: e})
          res.end()
        });
      } else {
        log.error('invalid request, must have email and name and a message')
        res.status(400)
        res.send({
          error: {
            message: 'invalid request, must have email and name and a message', type: 'missing parameter'
          }
        })
        res.end()
      }
    } else {
      log.error('invalid request, must have an email type')
      res.status(400)
      res.send({error: {message: 'invalid request, must have an email type', type: 'missing parameter'}})
      res.end()
    }
  } else {
    log.error('invalid dashboard api key')
    res.status(401)
    res.send({error: {message: 'invalid dashboard api key', type: 'unauthorized'}})
    res.end()
  }
})
app.get('/api/v1/updateEventbrite', (req, res) => {
  log.info('got a request to run eventbrite', req.get('host'))
  res.status(200)
  res.send('updating')
  res.end()
  updateFirebaseWithNewEventbriteData().then(e => {
    log.info('updated FB from eventbrite')
  })

})
app.get('/api/v1/waiverQue', (req, res) => {
  log.info('got a waiver que request')
  log.info(req.headers.authorization)
  if (req.headers.authorization === apiKeyAuth) {
    log.info('api good')
    db.collection('people').where("waiverStatus", "==", 1).get().then(snapshot => {
      log.info('gotten snapshot', snapshot.empty)
      let waiverQue = []
      snapshot.forEach(person => {
        // console.log('snapshot',person.id, person.data().profile.name)
        waiverQue.push(person.id)
      })
      res.status(200)
      res.send({success: true, que: waiverQue})
      log.info('sent waiver que', waiverQue.length, 'items')
      res.end()

    }).catch(e => {
      log.error(e)
      res.status(500)
      res.send({error: e, success: false})
      res.end()
    })
  } else {
    log.error('invalid dashboard api key')
    res.status(401)
    res.send({error: {message: 'invalid dashboard api key', type: "unauthorized"}})
    res.end()
  }
})
app.post('/api/v1/waiveruploaded', (req, res) => {
  log.info('got a request to update waiver info', req.body)
  const body = req.body;
  if (body.id && body.waiverStatus && body.waiverImage && body.waiverUploaded) {
    db.collection('people').doc(body.id).get().then(doc => {

      if (doc.exists) {

        log.info('person exists')

        let person = doc.data();
        person.waiverStatus = body.waiverStatus;
        person.waiverImage = body.waiverImage
        person.waiverUploaded = body.waiverUploaded
        db.collection('people').doc(body.id).set(person).then(() => {
          log.info('status updated')
          res.status(200)
          res.json({success: true})
          res.end()

        })
      } else {
        res.status(400)
        log.info('person doesnt exists')
        res.send({error: {message: 'person doesnt exist'}, success: false})
        res.end()
      }
    })
  } else {
    log.error('error must contain all option')
    res.status(400)
    res.send({error: {message: 'invalid request must contain all option'}, success: false})
    res.end()
  }
})
app.post('/api/v1/newAdminAccount', (req, res) => {
  log.info('got a request to create admin account', req.get('host'), req.body)


  const body = req.body;
  log.info(req.headers.authorization)
  log.info(req.headers.host.substr(0, 9))
  log.info(req.headers.origin.substr(0, 16))
  log.info(req.connection.encrypted)

  if (req.connection.encrypted || req.headers.host.substr(0, 9) === 'localhost' || req.headers.origin.substr(0, 16) === 'http://localhost' || req.headers.origin.substr(0, 6) === 'https:') {
    log.info('https good')
    if (req.headers.authorization === apiKeyAuth) {
      log.info('api good')
      const bytes = CryptoJS.AES.decrypt(body.user, apiKeyAuth);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      log.info(decryptedData.name, decryptedData.email)
      if (decryptedData.name && decryptedData.email && decryptedData.pass) {
        admin.auth().createUser({
          email: decryptedData.email,
          emailVerified: false,
          password: decryptedData.pass,
          displayName: decryptedData.name,

        })
        .then((userRecord) => {
          // See the UserRecord reference doc for the contents of userRecord.
          log.info('Successfully created new user:', userRecord.uid);
          res.status(200)
          res.send({success: true, uid: userRecord.uid})
          res.end()
        })
        .catch((error) => {
          log.error('Error creating new user:', error);
          res.status(500)
          res.json({success: false, error: error})
          res.end()
        });

      } else {
        log.error('make sure that there is an email name and password')
        res.status(400)
        res.send({error: {message: 'make sure that there is an email name and password'}})
        res.end()
      }

    } else {
      log.error('invalid dashboard api key')
      res.status(401)
      res.send({error: {message: 'invalid dashboard api key'}})
      res.end()
    }
  } else {
    log.error('not sent over https')
    res.status(401)
    res.send({error: {message: 'make sure request is sent over https'}})
    res.end()
  }


})
app.post('/api/v1/checkPersonStatus', (req, res) => {

  log.info('got a request to checkPersonStatus', req.get('host'), req.body.id)
  const id = req.body.id
  if (id && id.length === 10) {

    db.collection('people').doc(id).get().then(snap => {
      if (snap.exists) {
        let person = snap.data()
        db.collection('secrets').doc('eventbriteTicketTypes').get().then(snap => {
          const ticketTypes = snap.data()
          log.info(ticketTypes[person['ticket_class_id']].waiverRef, 'ref getting from FB')
          db.collection('publicRefs').doc(ticketTypes[person['ticket_class_id']].waiverRef).get().then(waiverInfo => {
            log.info(waiverInfo.exists)
            if (waiverInfo.exists) {
              const downloadURL = waiverInfo.data().download
              res.status(200)
              res.json({
                person: {
                  id: person.id,
                  waiverStatus: person.waiverStatus,
                  waiverDownloadURL: downloadURL
                }
              })
              res.end()
            } else {

              res.status(500)
              res.end()
            }

          })

        })

      } else {
        res.status(200)
        res.json({
          person: false
        })
        res.end()
      }
    })

  } else {
    res.status(400)
    res.json({
      error: true,
      type: 'Bad ID',
      message: 'ID not 10 characters long or does not exist'
    })
    res.end()
  }


})
app.post('/api/v1/unsubscribeEmail', (req, res) => {
  let body = req.body
  log.info('got a request to unsubscribe', body.email)
  if (body.email) {
    const email = body.email
    fetch('https://api.sendgrid.com/v3/contactdb/recipients', {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + keys.sendGrid,
      }
    }).then(resp => resp.json()).then(resp => {
      //console.log(resp.recipients)
      let recipientData = resp.recipients.find((recipient) => {
        return recipient.email == email
      })
      if (recipientData) {
        log.info('found recipeint ID', recipientData.id)
        fetch(`https://api.sendgrid.com/v3/contactdb/recipients/${recipientData.id}`, {
          method: 'delete',
          headers: {
            'Authorization': 'Bearer ' + keys.sendGrid,
          }
        }).then(resp => {
          res.status(200)
          res.json({'success': true})
          res.end()
        })

      } else {
        res.status(400)
        res.json({error: {message: 'email not in database', type: 'email does not exist'}})
        res.end()
      }

    })


  } else {
    res.status(400)
    res.json({
      error: true,
      type: 'no email',
      message: 'Request formatted incorrectly. Make sure there is an email.'
    })
    res.end()
  }
})
app.post('/api/v2/mailinglist', (req, res) => {
  const body = req.body
  log.info('got a request to add email to mailing list API v2', body)
  if (body.email) {
    fetch('api.sendgrid.com/contactdb/recipients', {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + keys.sendGrid
      }
    }).then(resp => resp.json()).then(contactsDB => {

    })
    let sendgridBody = {
      email: body.email,
      interests: JSON.stringify(body.interests),
      referrer: body.referrer
    }

  } else {
    res.status(400)
    res.send({
      error: {
        type: 'invalid request',
        message: 'make sure to include an email in the request'
      }
    })
    res.end()
  }

})
app.post('/api/v1/addEmail', (req, res) => {
  let body = req.body
  log.info('got a request to add email to list', body.email)
  if (body.email) {
    let apiBody = [
      {
        "email": body.email
      }
    ];
    fetch('https://api.sendgrid.com/v3/contactdb/recipients', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + keys.sendGrid,
        "content-type": "application/json"
      },
      body: JSON.stringify(apiBody)
    }).then(e => {
      log.info('added ' + body.email)
      res.status(200)
      res.send('added ' + body.email)
      const mailBody = {
        "personalizations": [
          {
            "to": [
              {
                "email": body.email,
                "name": body.email
              }
            ],
            "dynamic_template_data": {

              "unsubscribeUrl": 'https://emails.hyphen-hacks.com/u/' + body.email
            }
          }
        ],
        "from": {
          "email": "noreply@hyphen-hacks.com",
          "name": "Hyphen-Hacks Team"
        },
        "reply_to": {
          "email": "team@hyphen-hacks.com",
          "name": "Hyphen-Hacks Team"
        },
        "template_id": "d-ba94610139cc42d58137401f35989670",
        "tracking_settings": {
          "click_tracking": {
            'enable': true
          }
        }
      };
      log.info(JSON.stringify(mailBody))
      fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + keys.sendGrid,
          "content-type": "application/json"
        },
        body: JSON.stringify(mailBody)
      }).then(() => {
        log.info('confirmation email list sent')
      }).catch(e => {
        log.error(e)

      });
      res.end()

    }).catch(e => {
      log.error(e)
      res.status(400)
      res.json({
        error: true,
        type: 'sendgrid error',
        message: 'Request formatted incorrectly. Make sure there is an email.'
      })
      res.end()
    });

  } else {
    res.status(400)
    res.json({
      error: true,
      type: 'no email',
      message: 'Request formatted incorrectly. Make sure there is an email.'
    })
    res.end()
  }

})
app.post('/api/v1/attendee/waiverStatus', (req, res) => {

  log.info('got a request for attendee waiverStatus', req.get('host'), req.body.id)
  const id = req.body.id
  if (id && id.length === 10) {
    db.collection('people').doc(id).get().then(snap => {
      if (snap.exists) {
        let person = snap.data()
        res.status(200)
        res.json({
          waiverStatus: person.waiverStatus
        })
        res.end()
      } else {
        res.status(400)
        res.json({
          error: true,
          type: 'Person does not exist',
          message: 'ID does not correspond to a person in the DB'
        })
        res.end()
      }
    })

  } else {
    res.status(400)
    res.json({
      error: true,
      type: 'Bad ID',
      message: 'ID not 10 characters long or does not exist'
    })
    res.end()
  }


})
app.post('/api/v1/orderCancled', function (req, res) {
  console.info('recived eventbrite webhook order Cancled')
  res.status(200);
  res.send({status: ' reicved and prosessing'});
  const body = req.body;
  if (body.action === 'order.refunded') {
    console.info('Order refunded')
    log.info(body)
  } else {
    log.info('unknown action', body)
  }
})
app.post('/api/v1/eventbriteAttendeeUpdated', function (req, res) {
  console.info('recived eventbrite webhook attendee updated')
  res.status(200);
  res.send({status: ' reicved and prosessing'});
  const body = req.body;
  log.info(body)
  fs.writeFile(`./private/eventbriteapiWebhook-${new Date()}.json`, JSON.stringify(body), (e) => {
    log.error(e)
  })
  if (body.config.action === "attendee.updated") {
    let url = body.api_url
    //  console.log('edited: ' + url);
    let id = url.substr(url.length - 11)
    //  console.log(url, id, 'url,id')

    fetch(url, {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + keys.eventbriteAPIKey,
      }
    }).then((resp) => resp.json()).then(data => {
        if (data.error) {
          console.error(data.error, data.error_description, 'eventbrite fetch')
        } else {

          const i = data;
          fs.writeFile(`./private/eventbriteapinewperson-${new Date()}.json`, JSON.stringify(i), (e) => {
            log.error(e)
          })
          const person = {
            "resource_uri": i.resource_uri,
            "id": i.id,
            "changed": i.changed,
            "created": i.created,
            "quantity": i.quantity,
            "variant_id": i.variant_id,
            "profile": i.profile,
            // "phone": i.mo,
            "gender": i.answers[4],
            "birth_date": i.profile.birth_date,
            "email": i.profile.email,
            "name": i.profile.name,
            answers: i.answers,
            "ticket_class_name": i.ticket_class_name,
            "event_id": i.event_id,
            "order_id": i.order_id,
            "ticket_class_id": i.ticket_class_id,
            waiverStatus: 0,
            waiverImage: null,
            checkedIn: false,
            onCampus: false,
            waiverReviewedBy: ''
          }
          log.info('person', person)
          fs.writeFile('./private/samplePerson.json', JSON.stringify(person), (e) => {
          })
          fs.writeFile('./private/samplePersonApiReturn.json', JSON.stringify(data), (e) => {
          })
          db.collection('people').doc(person.id).get().then(e => {
            if (e.exists) {
              log.info('exists on fb')
            } else {
              log.info('doesnt exist on fb')
              //send emails here

              const mailBody = {
                "personalizations": [
                  {
                    "to": [
                      {
                        "email": person.profile.email,
                        "name": person.name
                      }
                    ],
                    "dynamic_template_data": {
                      "url": `https://waivers.hyphen-hacks.com/#/p/${person.id}`,
                      "firstName": person.profile.first_name
                    }
                  }
                ],
                "from": {
                  "email": "noreply@hyphen-hacks.com",
                  "name": "Ronan at Hyphen Hacks"
                },
                "reply_to": {
                  "email": "support@hyphen-hacks.com",
                  "name": "Ronan F"
                },
                "template_id": "d-1fc80d0de2804dc2add7cb7b4c9891d1",
                "tracking_settings": {
                  "click_tracking": {
                    'enable': true
                  }
                }
              };
              log.info('Sending welcome email to', person.profile.email)
              fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'post',
                headers: {
                  'Authorization': 'Bearer ' + keys.sendGrid,
                  "content-type": "application/json"
                },
                body: JSON.stringify(mailBody)
              }).catch(e => log.error(e));
              db.collection('people').doc(person.id).set(person).then((e) => {

                log.info('written? to fb')
              })
            }

          });


        }
      }
    )

  } else {
    log.info('other action', body.config.action)
  }


});
const server = app.listen(port, function () {

  const host = server.address().address
  const port = server.address().port

  log.info('API initialized and listening', host, port)

});
