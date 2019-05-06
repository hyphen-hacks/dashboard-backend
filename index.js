const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const uuidv4 = require('uuid/v4');
const CryptoJS = require("crypto-js");
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

  console.log('auth key intalized', apiKeyAuth)
})

let eventbriteData = []

function getEventbriteAttendees(url) {
  return new Promise(
    function (resolve, reject) {
      console.log('fetching ' + url)
      fetch(url, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + keys.eventbriteAPIKey,
        }
      }).then((resp) => resp.json()).then(data => {
        if (data.error) {
          console.error(data.error, data.error_description, 'eventbrite fetch')
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
  console.log('updating firebase with eventbrite...')
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
          console.log(`added ${i.id}`)
        }
      });

    })
  })
  console.log('done updating')
  return true
}

updateFirebaseWithNewEventbriteData().then(e => {
  console.log('next')
})

const express = require('express'),
  bodyParser = require('body-parser'),
  app = express(),
  port = 3000;
const cors = require('cors')
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors())
app.get('/', (req, res) => {
  res.send('HELLO')
})
app.get('/api/v1/updateEventbrite', (req, res) => {
  console.log('got a request to run eventbrite', req.get('host'))

  res.status(200)
  res.send('updating')
  res.end()
  updateFirebaseWithNewEventbriteData().then(e => {
    console.log('updated FB from eventbrite')
  })

})

app.post('/api/v1/newAdminAccount', (req, res) => {
  console.log('got a request to create admin account', req.get('host'), req.body)


  const body = req.body;
  console.log(req.headers.authorization)
  console.log(req.headers.host.substr(0, 9))
  console.log(req.headers.origin.substr(0, 16))

  if (req.connection.encrypted || req.headers.host.substr(0, 9) === 'localhost' || req.headers.origin.substr(0, 16) === 'http://localhost') {
    console.log('https good')
    if (req.headers.authorization === apiKeyAuth) {
      console.log('api good')
      const bytes = CryptoJS.AES.decrypt(body.user, apiKeyAuth);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      console.log(decryptedData)
      if (decryptedData.name && decryptedData.email && decryptedData.pass) {
        admin.auth().createUser({
          email: decryptedData.email,
          emailVerified: false,
          password: decryptedData.pass,
          displayName: decryptedData.name,

        })
        .then((userRecord) => {
          // See the UserRecord reference doc for the contents of userRecord.
          console.log('Successfully created new user:', userRecord.uid);
          res.status(200)
          res.send({success: true, uid: userRecord.uid})
          res.end()
        })
        .catch((error) => {
          console.log('Error creating new user:', error);
          res.status(500)
          res.json({success: false, error: error})
          res.end()
        });

      } else {
        res.status(400)
        res.send({error: {message: 'make sure that there is an email name and password'}})
        res.end()
      }

    } else {
      res.status(401)
      res.send({error: {message: 'invalid dashboard api key'}})
      res.end()
    }
  } else {
    res.status(401)
    res.send({error: {message: 'make sure request is sent over https'}})
    res.end()
  }


})
app.post('/api/v1/checkPersonStatus', (req, res) => {

  console.log('got a request to checkPersonStatus', req.get('host'), req.body.id)
  const id = req.body.id
  if (id && id.length === 10) {
    db.collection('people').doc(id).get().then(snap => {
      if (snap.exists) {
        let person = snap.data()
        res.status(200)
        res.json({
          person: {
            id: person.id,
            waiverStatus: person.waiverStatus
          }
        })
        res.end()
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
app.post('/api/v1/addEmail', (req, res) => {
  let body = req.body
  console.log('got a request to update email', req.get('host'))
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
      console.log(e)
      res.status(200)
      res.send('added ' + body.email)
      res.end()
    }).catch(e => {
      console.log(e)
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

  console.log('got a request for attendee waiverStatus', req.get('host'), req.body.id)
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
app.post('/api/v1/eventbriteAttendeeUpdated', function (req, res) {
  console.info('recived')
  res.status(200);
  res.send({status: ' reicved and prosessing'});
  const body = req.body;
  /*  fs.writeFile(`./private/eventbriteapi-${new Date()}.json`, JSON.stringify(body), (e) => {
      console.log(e)
    })*/
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

          const i = data

          const person = {
            "resource_uri": i.resource_uri,
            "id": i.id,
            "changed": i.changed,
            "created": i.created,
            "quantity": i.quantity,
            "variant_id": i.variant_id,
            "profile": i.profile,
            // "phone": i.mo,
            gender: i.profile.gender,
            age: i.profile.age,
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
          //  console.log('person', person)
          //  fs.writeFile('./private/samplePerson.json', JSON.stringify(person), (e) => {})
          //  fs.writeFile('./private/samplePersonApiReturn.json', JSON.stringify(data), (e) => {})
          db.collection('people').doc(person.id).get().then(e => {
            if (e.exists) {
              console.log('exists on fb')
            } else {
              console.log('doesnt exist on fb')
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
                  "email": "waivers@hyphenhacks.stomprocket.io",
                  "name": "Ronan at Hyphen Hacks"
                },
                "reply_to": {
                  "email": "hyphenhackslw@gmail.com",
                  "name": "Ronan F"
                },
                "template_id": "d-1fc80d0de2804dc2add7cb7b4c9891d1",
                "tracking_settings": {
                  "click_tracking": {
                    'enable': true
                  }
                }
              };
              console.log(JSON.stringify(mailBody))
              fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'post',
                headers: {
                  'Authorization': 'Bearer ' + keys.sendGrid,
                  "content-type": "application/json"
                },
                body: JSON.stringify(mailBody)
              }).catch(e => console.log(e));

            }
            db.collection('people').doc(person.id).set(person).then((e) => {
              console.log('written? to fb')
            })
          });


        }
      }
    )

  } else {
    console.log('other action', body.config.action)
  }


});
const server = app.listen(port, function () {

  const host = server.address().address
  const port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

});
