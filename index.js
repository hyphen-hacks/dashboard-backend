const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});
const db = admin.firestore();
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

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.send('HELLO')
})
app.post('/api/v1/eventbriteAttendeeUpdated', function (req, res) {
  console.info('recived')
  res.status(200);
  res.send({status: ' reicved and prosessing'});
  const body = req.body;
  let id = body.config.api_url
  if (id) {
    console.log('edited: ' + id);
    console.log(body)

    db.collection('people').doc(id.substr(id.length - 10)).get().then(e => {
      fetch(id, {
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
            if (e.exists) {
              console.log('allready exists but still updating')

            } else {
              console.log('doesn\'t exist yet getting added ')

            }
            db.collection('people').doc(id.substr(id.length - 10)).set(person)
          }


        }
      )


    });
  } else {
    console.log(body)
  }

});
const server = app.listen(port, function () {

  const host = server.address().address
  const port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

});